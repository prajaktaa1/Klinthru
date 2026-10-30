import { RestAdapterOptions, RestTestResult, testRestConnector } from "./security";

export type ConnectorTestTarget = {
  connectorType: "REST";
  endpoint: string;
};

export interface ConnectorAdapter {
  readonly connectorType: ConnectorTestTarget["connectorType"];
  test(target: ConnectorTestTarget): Promise<RestTestResult>;
}

export class RestConnectorAdapter implements ConnectorAdapter {
  readonly connectorType = "REST" as const;

  constructor(private readonly options: RestAdapterOptions = {}) {}

  test(target: ConnectorTestTarget): Promise<RestTestResult> {
    return testRestConnector(target.endpoint, this.options);
  }
}
