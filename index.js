import { Projeto } from "./projeto.js";
import { parseCmdLineOptions } from "./helper.js";

// Atenção> tenha os pacotes curl e imagemagick instalados no ambiente

const helpMsg = `
./index.js [options] título do livro

O título do livro é um parâmetro obrigatório. Ele será usado para criar um diretório de mesmo nome contendo o projeto e o resultado. 

Existem 2 modos de utilização:
  1) O modo manual, que é padrão, e é executado em 3 etapa: 
    1.1) Gera o livro.conf: Onde fica as definições dos personagens, roteiro e tamanho dos capítulos.
    1.2) Gera o esboço do livro, separado por capítulos, e que deve ser avaliado e ajustado.
    1.3) Processa os capitulos, baseando-se no esboço produzindo o livro como resultado final.
  2) O modo totalmente automatizado, chamado de resumo, que pode ser acionado com a opção: --resumo


Modo Manual:
  Ao rodar a primeira vez, será criado o diretório do projeto com arquivo de configuração livro.conf contendo os parâmetros exigidos para gerar o livro. Após modificar o livro.conf, rode uma segunda vez para criar o esboço do livro, valide, modifique se necessário for, e rode o comando mais um vez para, em fim, produzir o livro completo.

Modo Resumo:
  Passe uma a descrição do livro desejado para a opção --resumo e um livro completo será gerado.

Todas as execuções subsequentes gerarão um novo livro sobrescrevendo a anterior.

options:
  --novo-esboco   
      cria um novo esboço sobrescrevendo o anterior
  --resumo 'todo o texto do reusmo deve estar entre aspas' 
      cria um livro completo do resumo em um único passo
`.trim();

const { bookTitle, novoEsboco, resumo } = parseCmdLineOptions();

if (process.argv.length === 2 || bookTitle.length <= 1) {
  console.log(helpMsg);
  process.exit(0);
}

console.error("• Título:", bookTitle);
if (resumo) console.error("• Resumo:", resumo);
if (novoEsboco) console.error("• Novo Escoço: √");

const projeto = new Projeto(bookTitle, resumo);

async function main() {
  await projeto.init(resumo);
  if (projeto.isNewProject && !resumo) {
    console.error("-> Um novo projeto foi criado em", projeto.bookPath);
    console.error(
      "-> Modifique o arquivo",
      projeto.confPath,
      "para configurar as características do livro."
    );
    return;
  }
  if (!projeto.esboco || novoEsboco || resumo) {
    await projeto.gerarEsboco();
    console.error(
      "-> Um esboço do livro foi gerado em",
      projeto.escoboPath,
      "ele será seguido para gerar os capítulos do livro."
    );
    if (resumo) {
      console.error(
        "-> Embora no modo resumo o esboço não precise ser configurado, ele ficará disponível para uma possível intervenção manual o que permite que uma nova execução sem o parâmetro --resumo produza um novo livro."
      );
    } else {
      console.error(
        "-> Ele não será sobrecristo, a menos que use o parâmetro: --novo-esboco."
      );
      console.error(
        "-> Revise-o e quando estiver OK, rode o comando mais uma vez para, enfim, gerar o livro."
      );
      return;
    }
  }
  await projeto.gerarImagens();
  await projeto.gerarLivro();
}

main().then(() => console.error(":: Fim ::"));
