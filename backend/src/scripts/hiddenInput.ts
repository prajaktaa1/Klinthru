import readline from "readline";

export function parseHiddenInput(chunks: string[]): string {
  let value = "";
  for (const chunk of chunks) {
    for (const character of chunk) {
      if (character === "\r" || character === "\n") return value;
      if (character === "\b" || character === "\u007f") value = value.slice(0, -1);
      else value += character;
    }
  }
  return value;
}

export function askHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;
  stdin.setRawMode?.(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString();
      if (text.includes("\u0003")) { cleanup(); reject(new Error("Cancelled.")); return; }
      const result = parseHiddenInput([value, text]);
      const ended = /[\r\n]/.test(text);
      value = result;
      if (ended) { cleanup(); process.stdout.write("\n"); resolve(value); }
    };
    const cleanup = () => { stdin.off("data", onData); stdin.setRawMode?.(wasRaw ?? false); stdin.pause(); };
    stdin.on("data", onData);
  });
}

export function askVisible(question: string): Promise<string> {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => prompt.question(question, answer => { prompt.close(); resolve(answer); }));
}
