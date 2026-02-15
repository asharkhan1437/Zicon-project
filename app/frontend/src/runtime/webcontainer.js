import { WebContainer } from "@webcontainer/api";

let container;

export async function initWebContainer() {
  if (!container) {
    container = await WebContainer.boot();
  }
  return container;
}

export async function runCommand(command) {
  if (!container) throw new Error("WebContainer not initialized");
  const cmdParts = command.split(" ");
  const proc = await container.spawn(cmdParts[0], cmdParts.slice(1));

  let output = "";

  proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        output += new TextDecoder().decode(chunk);
      },
    })
  );

  await proc.exit;

  return output;
}
