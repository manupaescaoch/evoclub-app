# Laudo automático de avaliação EVO Club

## Objetivo
Transformar cada avaliação manual ou importada confirmada em um PDF próprio da EVO Club, salvo junto ao histórico do aluno. O laudo terá quatro páginas A4, comparação automática com a avaliação imediatamente anterior e nunca completará dados ausentes por estimativa.

## O que será construído

### 1. Dados necessários para um laudo fiel
- Ampliar a avaliação para guardar, quando existirem no laudo original:
  - intervalos de referência dos indicadores;
  - percentuais e classificações da análise segmentar;
  - identificação complementar do equipamento;
  - caminho, nome, versão e data de geração do PDF EVO.
- Manter o arquivo original privado e separado do PDF EVO.
- Estender a leitura de PDF, PNG e JPG para extrair também intervalos, percentuais e classificações impressos, preservando a revisão obrigatória antes do salvamento.
- Na avaliação manual, manter o fluxo atual e usar somente os campos efetivamente preenchidos.

### 2. Geração automática e persistente
- Criar um gerador seguro no backend que recebe o identificador da avaliação, valida a permissão e busca:
  - dados atuais;
  - aluno, unidade e avaliador;
  - avaliação anterior imediatamente anterior à data/hora atual;
  - intervalos e dados segmentares disponíveis.
- Gerar um arquivo PDF real, armazená-lo em área privada e registrar o vínculo na avaliação.
- Disparar a geração logo após:
  - publicar uma avaliação manual;
  - confirmar uma importação;
  - salvar uma correção;
  - usar a ação “Gerar novamente”.
- Se a geração falhar, a avaliação continuará salva e a tela mostrará uma mensagem clara com opção de tentar novamente.
- Nome do arquivo: `avaliacao-evo-[nome-do-aluno]-[dd-mm-aaaa].pdf`.

### 3. PDF EVO Club em quatro páginas
Cada página terá cabeçalho preto, símbolo azul oficial, texto “EVO CLUB” sem “Training Club”, azul EVO nos destaques, cartões cinza-claro, rodapé “EVO CLUB • A escolha de quem busca excelência” e numeração.

**Página 1 — Resumo executivo**
- Identificação disponível: aluno, ID, sexo, idade, altura, unidade e avaliador.
- Cards: peso, massa muscular esquelética, percentual de gordura e pontuação geral.
- Barras de peso, massa muscular, massa de gordura, gordura corporal, IMC e gordura visceral.
- As barras usarão somente faixas extraídas do laudo; sem faixa cadastrada, mostrarão o valor sem inventar posição ou classificação.
- Controle corporal e leitura objetiva gerada por regras determinísticas com base apenas nos dados presentes.

**Página 2 — Composição e indicadores**
- Composição corporal e indicadores metabólicos/de risco.
- Resultado, faixa e classificação apenas quando disponíveis.
- Verde para normal; amarelo para abaixo/acima ou atenção.
- Notas obrigatórias sobre origem dos intervalos, contexto profissional e ausência de diagnóstico médico.

**Página 3 — Análise segmentar**
- Massa magra e gordura para braços, tronco e pernas, separando os lados.
- Valor, percentual e classificação somente quando cadastrados.
- Leitura objetiva sobre equilíbrio lateral, distribuição e pontos de atenção, sem inferir dados faltantes.

**Página 4 — Comparativo**
- Comparação automática com a avaliação imediatamente anterior.
- Valor anterior, atual, variação absoluta e percentual.
- Regras específicas por composição: gordura e massa muscular recebem leitura contextual; peso fica neutro isoladamente; risco considera a faixa cadastrada.
- Verde para evolução positiva, vermelho para negativa, cinza para estável e azul para informação neutra.
- Resumo da evolução em até três frases.
- Sem avaliação anterior: mostrar valores atuais, “Primeira avaliação registrada”, sem valores anteriores nem variações.

### 4. Ações na aba Avaliações
Na avaliação completa e na lista, disponibilizar conforme a permissão:
- Visualizar PDF EVO;
- Baixar PDF EVO;
- Compartilhar pelo WhatsApp usando o compartilhamento de arquivo do celular; no computador, baixar o arquivo e abrir o WhatsApp com mensagem pronta;
- Ver avaliação completa;
- Consultar arquivo original somente para a equipe autorizada;
- Editar dados;
- Gerar novamente;
- Excluir com confirmação e permissão de exclusão.

O aluno verá apenas o PDF EVO; o laudo original continuará restrito à consulta interna da equipe.

## Regras de segurança e consistência
- Nunca salvar importação antes da revisão e confirmação.
- Nunca inventar valores, intervalos, percentuais ou diagnósticos.
- Preservar vírgula decimal na apresentação e unidades corretas.
- Comparar pela data/hora da avaliação, não pela ordem de criação.
- Manter detecção de duplicidade e validação do aluno.
- PDFs e originais ficam privados, com acesso temporário e isolamento por unidade/aluno.
- Registrar geração, regeneração, download, exclusão e compartilhamento no histórico de auditoria quando aplicável.

## Validação
- Testar avaliação importada com o arquivo enviado e avaliação manual com campos parciais.
- Testar primeira avaliação e avaliação com anterior.
- Conferir as quatro páginas renderizadas em imagens, verificando margens, cortes, sobreposição, fontes, cores e numeração.
- Validar visualização e download no celular e no computador.
- Validar compartilhamento móvel, regeneração, correção, exclusão e acesso restrito ao original.
- Confirmar que gráficos, histórico e retrospectiva continuam usando os dados estruturados existentes.

## Detalhes técnicos
- Nova função de geração de PDF no backend, sem expor chaves ou arquivos privados.
- Armazenamento privado com políticas por aluno, equipe e unidade.
- PDF produzido com dimensões A4 e posições fixas para garantir quatro páginas estáveis.
- Resumos e classificações calculados por regras locais auditáveis; a IA continuará restrita à extração do documento importado.
- A geração automática será idempotente: regenerar substitui a versão vinculada sem criar avaliações duplicadas.
