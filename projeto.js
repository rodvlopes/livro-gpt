import { writeFileSync, readFileSync, existsSync } from "fs";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { execSync } from "child_process";
import slugify from "@sindresorhus/slugify";
import { generateText, getImage } from "./helper.js";

const initRulesPrompt = `Você é um assistente que sabe escrever livros em português. E obedece as seguintes regras:
Regra 1: Deve ser escrito de maneira a parecer que foi escrito por um humano.
Regra 2: Deve ser escrito em português formal.
Regra 3: Todos os capítulos devem ser narrados como uma conto.
Regra 4: Copie o estilo de escrita o autor José Saramago.
Regra 5: Não utilize as palavras: personagem, personagens, protagonista.
Regra 6: Você deve detalhar fisicamente o ambiente em que os personagens estão inseridos assim como o ambiente em que eles estão vivendo.
Regra 7: Valorize as ações e as interações entre os personagens.
Regra 8: Não faça menção às regras.`;

const htmlTemplates = {
  book: `<!DOCTYPE html>
  <html>
  <head>
      <title>#bookTitle#</title>
      <link rel="stylesheet" media="screen" href="../index.css">
      <meta name=viewport content="user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1,width=device-width">
      <meta charset=utf-8>
  </head>
  <body>	
    <h1>#bookTitle#</h1>
    <div id="indice">
      <h3>Índice</h3>
      <ul>
          #indice#
      </ul>
    </div>
    #capitulos#
  </body>
  </html>`,
  indiceItem: '<li><a href="#capitulo#i#">#capTitle#</a></li>',
  capitulo: `
    <div id="capitulo#i#">
      <h2>#capTitle#</h2>
      <img src="cap#i#.jpg" alt="Imagem do #capTitle#">
      #ps#
    </div>`,
};

const confTemplate = `
[Título do Livro | bookTitle]
#bookTitle#

[Estilo ou técnica visual que as figuras devem ter | estiloFiguras]
técnica de pastel seco em preto e branco

[Número de capítulos | numCapitulos]
8

[Número mínimo de parágrafos por capítulo | capSizeMin]
8

[Número máximo de parágrafos por capítulo | capSizeMax]
12

[Protagonista(s) | protagonista]
João, um homem magro, astuto e com características comuns.

[Coadjuvante(s) | coadjuvantes]
Maria é um mulher frágil, única e inteligente se comunica com mensagens profundas. Acompanha joão do início ao fim do conto.
José é amigo do João e o apoia nos momentos difíceis.

[Época em que a história acontece | epoca]
Estamos no futuro, um tempo em que a inteligência artificial eliminou os empregos. O gorverno controla a informação, e a vigilância é constante.

[Roteiro Desejado | roteiro]
João reside em um ambiente inóspito assim como a maioria das pessoas 
ele tenta se esquivar da tirania da classe dominante. 
Drones sobrevoam o buscam aqueles que tentam não obedecer. 
O governo não é capaz de suprir em nada a crescente demanda por alimentos e uma vida digna. 
As milícias urbanas se multiplicam.
O clímax é quando José trai João e tenta fugir sozinho com Maria.
O final não é feliz para nenhuma parte.
`.trim();

const confEmptyTemplate = `
[Título do Livro | bookTitle]
#bookTitle#

[Estilo ou técnica visual que as figuras devem ter | estiloFiguras]
técnica de pastel seco em preto e branco

[Número de capítulos | numCapitulos]
8

[Número mínimo de parágrafos por capítulo | capSizeMin]
8

[Número máximo de parágrafos por capítulo | capSizeMax]
12

[Protagonista(s) | protagonista]
#protagonista#

[Coadjuvante(s) | coadjuvantes]
#coadjuvantes#

[Época em que a história acontece | epoca]
presente

[Roteiro Desejado | roteiro]
#roteiro#
`.trim();

export class Projeto {
  bookTitle = "";
  bookPath = "";
  confPath = "";
  htmlPath = "";
  escoboPath = "";
  isNewProject = true;
  conf = {};
  #esboco = undefined;

  constructor(bookTitle) {
    this.bookTitle = bookTitle;
    const bookTitleSlug = slugify(bookTitle);
    this.bookPath = `./livros/${bookTitleSlug}`;
    this.confPath = `${this.bookPath}/livro.conf`;
    this.htmlPath = `${this.bookPath}/index.html`;
    this.mdPath = `${this.bookPath}/livro.md`;
    this.escoboPath = `${this.bookPath}/esboço.txt`;
    this.isNewProject = !existsSync(this.confPath);
  }

  async init(resumo) {
    if (this.isNewProject || resumo) {
      await this.createProject(resumo);
    }
    this.conf = this.parseConf(readFileSync(this.confPath, "utf8"));
  }

  async createProject(resumo) {
    const newConf = resumo
      ? await this.createConfFromResumo(resumo)
      : confTemplate.replace("#bookTitle#", this.bookTitle);
    if (!existsSync(this.bookPath)) {
      execSync(`mkdir ${this.bookPath}`);
    }
    writeFileSync(this.confPath, newConf);
  }

  async createConfFromResumo(resumo) {
    console.error(
      "[GPT] Gerando um roteiro preliminar baseado no resumo:",
      resumo
    );
    const roteiro1 = await generateText(
      { role: "system", content: initRulesPrompt },
      {
        role: "user",
        content: `Gere um roteiro de um livro sobre '${resumo}' com até 100 palavras. Não oganize por capítulos.`,
      }
    );

    console.error("[GPT] Gerando o protagonista.");
    const protagista = await generateText(
      { role: "system", content: initRulesPrompt },
      {
        role: "user",
        content: `Gere um roteiro de um livro sobre '${resumo}' com até 100 palavras. Não oganize por capítulos.`,
      },
      {
        role: "assistant",
        content: roteiro1,
      },
      {
        role: "user",
        content:
          "Gera um protagosnista, com nome, idade e forma física para este roteiro.",
      }
    );

    console.error("[GPT] Gerando coadjuvantes.");
    const coadjuvantes = await generateText(
      { role: "system", content: initRulesPrompt },
      {
        role: "user",
        content: `Gere um roteiro de um livro sobre '${resumo}' com até 100 palavras. Não oganize por capítulos.`,
      },
      {
        role: "assistant",
        content: roteiro1,
      },
      {
        role: "user",
        content:
          "Gera um protagosnista, com nome, idade e forma física para este roteiro.",
      },
      {
        role: "assistant",
        content: protagista,
      },
      {
        role: "user",
        content:
          "Gera pelo menos 2 coadjuvantes, com nome, idade e forma física para este roteiro.",
      }
    );

    console.error("[GPT] Gerando o roteiro final.");
    const roteiro2 = await generateText(
      { role: "system", content: initRulesPrompt },
      {
        role: "user",
        content: `Gere um roteiro de um livro sobre '${resumo}' com até 100 palavras. Não oganize por capítulos.`,
      },
      {
        role: "assistant",
        content: roteiro1,
      },
      {
        role: "user",
        content:
          "Gera um protagosnista, com nome, idade e forma física para este roteiro.",
      },
      {
        role: "assistant",
        content: protagista,
      },
      {
        role: "user",
        content:
          "Gera pelo menos 2 coadjuvantes, com nome, idade e forma física para este roteiro.",
      },
      {
        role: "assistant",
        content: coadjuvantes,
      },
      {
        role: "user",
        content:
          "Gere um novo roteiro relacionando o protagista com os coadjuvantes em até 100 palavras. Não oganize por capítulos.",
      }
    );

    return confEmptyTemplate
      .replace("#protagonista#", protagista)
      .replace("#coadjuvantes#", coadjuvantes)
      .replace("#roteiro#", roteiro2)
      .replace("#bookTitle#", this.bookTitle);
  }

  salvarHtml(livroGerado) {
    const capitulos = [];
    const indice = [];
    for (const [i, capTitle, body] of livroGerado) {
      const ps = body.split("\n\n").join("</p><p>\n");
      capitulos.push(
        htmlTemplates.capitulo
          .replace(/#capTitle#/g, capTitle)
          .replace(/#i#/g, i)
          .replace("#ps#", `<p class="first">${ps}</p>`)
      );
      indice.push(
        htmlTemplates.indiceItem
          .replace("#i#", i)
          .replace("#capTitle#", capTitle)
      );
    }

    const livroHtml = htmlTemplates.book
      .replace("#indice#", indice.join("\n"))
      .replace(/#bookTitle#/g, this.bookTitle)
      .replace("#capitulos#", capitulos.join("\n\n"));
    writeFileSync(this.htmlPath, livroHtml);

    return livroHtml;
  }

  salvarMdFromHtml(htmlStr) {
    const md = NodeHtmlMarkdown.translate(
      htmlStr,
      /* options (optional) */ {},
      /* customTranslators (optional) */ undefined,
      /* customCodeBlockTranslators (optional) */ undefined
    );

    writeFileSync(this.mdPath, md);
  }

  parseConf(confStr) {
    let lines = confStr.split("\n").filter((l) => !l.startsWith("//")); //remove linhas que começam com // pq são comentários
    let defValue, defName;
    const conf = {};

    for (const i in lines) {
      const line = lines[i];
      const definitionMatcher = line.match(/\[.+\|\s*([^\s]+)\s*\]/);
      if (definitionMatcher) {
        if (defName) {
          conf[defName] = defValue.join("\n").trim();
        }
        defName = definitionMatcher[1];
        defValue = [];
      } else if (defValue) {
        defValue.push(line);
      }
    }
    conf[defName] = defValue.join("\n").trim();

    return conf;
  }

  get esboco() {
    if (this.#esboco === undefined && this.#existeEsboco()) {
      this.#esboco = readFileSync(this.escoboPath, "utf8");
    }
    return this.#esboco;
  }

  set esboco(esb) {
    this.#salvarEsboco(esb);
    this.#esboco = esb;
  }

  #salvarEsboco(esbocoStr) {
    writeFileSync(this.escoboPath, esbocoStr);
  }

  #existeEsboco() {
    return existsSync(this.escoboPath);
  }

  async gerarEsboco() {
    const { numCapitulos, protagonista, coadjuvantes, epoca, roteiro } =
      this.conf;
    const esbocoPrompt = `Eu quero um esboço de um livro de ficção com ${numCapitulos} capítulos basedo no seguinte resumo:
O protagonista é ${protagonista}
Os coadjuvantes são: ${coadjuvantes}
A época em que a história acontece é: ${epoca}
A hitória segue o seguinte roteiro: ${roteiro}`;

    console.error("[GPT] Gerando um esboço para o livro.");
    this.#esboco = await generateText(
      initRulesPrompt,
      "Eu seguirei as regras pedidas.",
      esbocoPrompt
    );
    this.#salvarEsboco(this.#esboco);
    return this.#esboco;
  }

  // returns lista de capítulos: [[capNum, capTitulo, capSumario], ...]
  get esbocoDecomposto() {
    return this.esboco
      .split(/Capítulo \d+\s*[:-]\s*/)
      .filter((it) => it !== "")
      .map((it, i) => {
        const [title, ...capSum] = it.split("\n");
        return [i + 1, title, capSum.join("\n")];
      });
  }

  async gerarImagens() {
    const { epoca, estiloFiguras } = this.conf;

    for (const [i, title, capSum] of this.esbocoDecomposto) {
      const descricaoCena = await generateText(
        `${epoca}\n
        Considere ambiente acima e descreva em até 30 palavras uma figura séria que representa o texto a seguir:
        ${capSum}
        `
      );
      // const descricaoCena = capSum

      await getImage(
        `${this.bookPath}/cap${i}`,
        `Faça um imagem usando a ${estiloFiguras} considerando a descrição a seguir: ${descricaoCena}`
      );
    }
  }

  async gerarLivro() {
    console.error(`[GPT] Gerando o livro.`);

    const livro = [];
    const esbocoDecomposto = this.esbocoDecomposto;
    const { capSizeMin, capSizeMax } = this.conf;

    for (const [capNum, title, capSum] of esbocoDecomposto) {
      console.error(`[GPT] Processando o capítulo ${capNum} - ${title}`);

      const capData = await generateText(
        { role: "system", content: initRulesPrompt },
        { role: "user", content: "Escreva um esboço de um livro." },
        {
          role: "assistant",
          content: `Aqui está o esboço de um livro com ${esbocoDecomposto.length} capítulos:\n\n${this.esboco}`,
        },
        {
          role: "user",
          content: `Escreva de ${capSizeMin} e ${capSizeMax} parágrafos, detalhando o capítulo ${capNum}. Não mencione o título do capítulo e nem o número dele.`,
        }
      );

      // console.error("capData: ", capData);

      livro.push([capNum, `Capítulo ${capNum} - ${title}`, capData]);
    }

    const html = this.salvarHtml(livro);
    this.salvarMdFromHtml(html);
    return livro;
  }
}
