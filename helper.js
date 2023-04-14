import { Configuration, OpenAIApi } from "openai";
import { execSync } from "child_process";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function generateText(...prompts) {
  try {
    const messages =
      typeof prompts[0] === "object"
        ? prompts
        : prompts.map((p, i) => ({
            role: i % 2 === 0 ? "user" : "assistant",
            content: p,
          }));
    // console.error("generateText", messages);
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });
    const output = response.data.choices[0].message.content;
    // console.log(output);
    return output;
  } catch (error) {
    console.error(error);
    // console.log(error.response.status, error.response.statusText);
  }
}

export async function listModels() {
  const response = await openai.listModels();
  console.log(
    "Models",
    response.data.data.map((d) => d.id)
  );
}

export async function getImage(fname, prompt) {
  const url = await getImageWithRetry(prompt);
  if (url) {
    downloadAsJpg(url, fname);
  }
}

async function getImageWithRetry(prompt) {
  console.error("[DALL-E]", prompt);
  try {
    const response = await openai.createImage({
      prompt,
      n: 1,
      size: "256x256",
    });
    const image_url = response.data.data[0].url;
    console.error("[DALL-E] sucesso.");
    return image_url;
  } catch (error) {
    // console.error("[DALL-E] error", error);
    console.error("[DALL-E] error", error.response?.data?.error);
    // console.error(
    //   "getImage error",
    //   error.response.status,
    //   error.response.statusText,
    //   error.response.data.error
    // );
    if (error.response.data.error.type === "invalid_request_error") {
      const [como, ...oque] = prompt.split(":");
      console.error("invalid_request_error for", oque.join(":"));
      const oque2 = await generateText(
        `Descreva uma cena visual com até 30 palavras para esta frase: ${oque.join(
          ":"
        )}`
      );
      return getImageWithRetry([como, " " + oque2].join(":"));
    }
    // console.error('getImageWithRetry error', error)
  }
}

function downloadAsJpg(uri, filename) {
  let command = `curl -o - '${uri}' 2>/dev/null | convert - ${filename}.jpg`;
  return execSync(command);
}

export function parseCmdLineOptions() {
  const [_0, _1, ...argsTail] = process.argv;
  const possibleOptions = ["--novo-esboco", "--resumo"];

  const novoEsboco = argsTail.includes("--novo-esboco");
  const iResumo = argsTail.indexOf("--resumo");
  const resumo = iResumo > -1 ? argsTail[iResumo + 1] : undefined;

  const bookTitle = argsTail
    .filter((it) => !possibleOptions.includes(it))
    .filter((it) => it !== resumo)
    .join(" ")
    .trim();

  return {
    bookTitle,
    novoEsboco,
    resumo,
  };
}
