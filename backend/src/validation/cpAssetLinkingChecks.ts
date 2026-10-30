import assert from "node:assert/strict";

process.env.DATABASE_URL = "";
process.env.NODE_ENV = "test";

import { validateAssetInput } from "./assetMasterValidation";

type Store = typeof import("../data/store").store;

let store: Store;

async function createPipeline(code: string) {
  return store.createPipeline({
    pipeline: {
      pipelineCode: code,
      pipelineName: `${code} Pipeline`,
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L Grade B",
      status: "Active"
    },
    createdById: "user-engineer"
  });
}

async function expectReject(promise: Promise<unknown>, message: string) {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }

  assert.equal(rejected, true, message);
}

async function main() {
  ({ store } = await import("../data/store"));

  const pipeline = await createPipeline("CP-LINK-1");
  const otherPipeline = await createPipeline("CP-LINK-2");

  const testPostAsset = await store.saveAsset({
    asset: {
      pipelineId: pipeline.id,
      assetId: "LINK-TP-001",
      assetType: "TEST_POST",
      side: "LHS",
      physicalStatus: "Active"
    }
  });
  assert.equal(testPostAsset.side, "LHS", "TEST_POST Asset with side=LHS must be accepted and returned");

  const rhsTestPostAsset = await store.saveAsset({
    asset: {
      pipelineId: pipeline.id,
      assetId: "LINK-TP-002",
      assetType: "TEST_POST",
      side: "RHS",
      physicalStatus: "Active"
    }
  });
  assert.equal(rhsTestPostAsset.side, "RHS", "TEST_POST Asset with side=RHS must be accepted and returned");

  const sideOmittedAsset = await store.saveAsset({
    asset: {
      pipelineId: pipeline.id,
      assetId: "LINK-TP-003",
      assetType: "TEST_POST",
      physicalStatus: "Active"
    }
  });
  assert.equal(sideOmittedAsset.side, undefined, "Omitted Side must remain valid");
  assert.equal(
    validateAssetInput({
      pipelineId: pipeline.id,
      assetId: "LINK-TP-004",
      assetType: "TEST_POST",
      side: null,
      physicalStatus: "Active"
    }).side,
    undefined,
    "Null Side must remain valid"
  );
  assert.throws(
    () =>
      validateAssetInput({
        pipelineId: pipeline.id,
        assetId: "LINK-TP-005",
        assetType: "TEST_POST",
        side: "LEFT",
        physicalStatus: "Active"
      }),
    "Invalid Side must be rejected"
  );

  const rectifierAsset = await store.saveAsset({
    asset: {
      pipelineId: pipeline.id,
      assetId: "LINK-RECT-001",
      assetType: "RECTIFIER",
      physicalStatus: "Active"
    }
  });
  const otherPipelineAsset = await store.saveAsset({
    asset: {
      pipelineId: otherPipeline.id,
      assetId: "LINK-TP-OTHER",
      assetType: "TEST_POST",
      physicalStatus: "Active"
    }
  });

  const linkedTestPoint = await store.saveCpTestPoint({
    testPoint: {
      pipelineId: pipeline.id,
      assetMasterId: testPostAsset.id,
      name: "CP monitoring link check"
    }
  });
  assert.equal(linkedTestPoint.assetMasterId, testPostAsset.id);
  assert.equal(linkedTestPoint.code, testPostAsset.assetId);
  assert.equal(linkedTestPoint.asset?.assetType, "TEST_POST");
  assert.equal(linkedTestPoint.asset?.side, "LHS", "CP Test Point response must expose Side through Asset Master");
  assert.equal("side" in linkedTestPoint, false, "CpTestPoint must not gain duplicate Side ownership");

  const linkedRectifier = await store.saveCpRectifier({
    rectifier: {
      pipelineId: pipeline.id,
      assetMasterId: rectifierAsset.id,
      name: "Rectifier link check"
    }
  });
  assert.equal(linkedRectifier.assetMasterId, rectifierAsset.id);
  assert.equal(linkedRectifier.rectifierCode, rectifierAsset.assetId);
  assert.equal(linkedRectifier.asset?.assetType, "RECTIFIER");

  await expectReject(
    store.saveCpTestPoint({
      testPoint: {
        pipelineId: pipeline.id,
        assetMasterId: rectifierAsset.id
      }
    }),
    "RECTIFIER Asset must not link to CpTestPoint"
  );

  await expectReject(
    store.saveCpRectifier({
      rectifier: {
        pipelineId: pipeline.id,
        assetMasterId: testPostAsset.id
      }
    }),
    "TEST_POST Asset must not link to CpRectifier"
  );

  await expectReject(
    store.saveCpTestPoint({
      testPoint: {
        pipelineId: pipeline.id,
        assetMasterId: otherPipelineAsset.id
      }
    }),
    "Asset from another pipeline must not link"
  );

  await expectReject(
    store.saveCpTestPoint({
      testPoint: {
        pipelineId: pipeline.id,
        assetMasterId: testPostAsset.id
      }
    }),
    "Already-linked Asset must not link twice"
  );

  const updatedTestPoint = await store.saveCpTestPoint({
    id: linkedTestPoint.id,
    testPoint: { notes: "CP-only update" }
  });
  assert.equal(updatedTestPoint.id, linkedTestPoint.id, "CP test point ID must stay stable");
  assert.equal(updatedTestPoint.assetMasterId, linkedTestPoint.assetMasterId, "Asset link must stay stable on update");

  const updatedRectifier = await store.saveCpRectifier({
    id: linkedRectifier.id,
    rectifier: { notes: "CP-only rectifier update" }
  });
  assert.equal(updatedRectifier.id, linkedRectifier.id, "CP rectifier ID must stay stable");
  assert.equal(updatedRectifier.assetMasterId, linkedRectifier.assetMasterId, "Rectifier asset link must stay stable on update");

  console.log("CP asset linking checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
