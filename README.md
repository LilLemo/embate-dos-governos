Embate dos Governos: Salário Mínimo vs. Poder de Compra 📊

Uma aplicação web gamificada que transforma a análise do poder de compra no Brasil em um 'embate' entre governos. Projeto de TCC com Python (Flask), JavaScript e IA Generativa.

Sobre o Projeto

Este projeto, desenvolvido como Trabalho de Conclusão de Curso (TCC), visa democratizar o acesso e a análise de dados econômicos históricos do Brasil, focando na relação entre o Salário Mínimo, o custo da Cesta Básica (São Paulo) e o Salário Mínimo Necessário (calculado pelo DIEESE) desde a estabilização do Plano Real (1995).

Inspirado em jogos de luta clássicos, o "Embate dos Governos" permite ao usuário selecionar dois períodos governamentais ("lutadores") para uma comparação direta. A análise é apresentada de forma visual através de gráficos e indicadores-chave (KPIs), e narrada pelo personagem Dadinho, uma IA que atua como locutor e comentarista, explicando os resultados de forma simples e divertida.

A aplicação utiliza um sistema de pontuação baseado em 3 métricas principais para determinar o "vencedor" do embate, oferecendo uma perspectiva quantitativa sobre qual período foi mais favorável ao poder de compra do trabalhador, dentro do escopo limitado da análise.



Funcionalidades Principais

Seleção de "Lutadores": Interface inspirada em jogos para escolher dois períodos de governo (1995-2025).

Visualização Comparativa: Gráficos de linha (Salário Mínimo vs. Cesta Básica) e gráficos de pizza (% do salário comprometido) lado a lado.

KPIs Essenciais: Cálculo e exibição de:

Aumento % do Salário Mínimo no período.

Média de Horas de Trabalho necessárias para comprar a Cesta Básica.

Comparativo entre o Salário Mínimo Real e o Salário Mínimo Necessário (multiplicador "X vezes").

Análise por IA (Dadinho): Narração dos resultados em formato de "rounds", gerada dinamicamente via API (Gemini com fallback para DeepSeek).

Transparência: Seção "Ficha Técnica" com informações baseadas nos conceitos de Datasheets for Datasets e Model Cards.

Tecnologias Utilizadas

Back-End: Python 3 + Flask (para servir a API e processar os dados).

Front-End: HTML5, CSS3, JavaScript (ES6+).

Banco de Dados: SQLite (para armazenar os dados históricos).

Bibliotecas Python: Pandas (manipulação de dados), google-generativeai (API Gemini), openai (API DeepSeek via compatibilidade), python-dotenv (gerenciamento de chaves).

Bibliotecas JavaScript: Chart.js (geração de gráficos).

APIs de IA: Google Gemini API (principal), DeepSeek API (contingência).

Como Executar Localmente

Clone o repositório:

git clone [https://github.com/SEU_USUARIO/embate-dos-governos.git](https://github.com/SEU_USUARIO/embate-dos-governos.git)
cd embate-dos-governos


Crie e ative um ambiente virtual (recomendado):

python -m venv venv
# No Windows:
.\venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate


Instale as dependências:

pip install Flask pandas google-generativeai openai python-dotenv


Configure as Chaves de API:

Crie um arquivo chamado .env na raiz do projeto.

Adicione suas chaves de API dentro dele:

GEMINI_API_KEY="SUA_CHAVE_GEMINI"
DEEPSEEK_API_KEY="SUA_CHAVE_DEEPSEEK"


Obtenha o Banco de Dados:

Certifique-se de que o arquivo dados_analiticos.db está na raiz do projeto. (Nota: Este arquivo não está incluído no repositório por padrão. Eu ainda to vendo como subir ele, se acalme).

Execute o servidor:

python servidor_ia.py


Acesse no navegador: Abra seu navegador e vá para http://localhost:5000.

Fontes dos Dados

Os dados utilizados neste projeto foram compilados a partir das seguintes fontes públicas:

DIEESE (Cesta Básica e Salário Mínimo Necessário): https://www.dieese.org.br/analisecestabasica/salarioMinimo.html

Portal Contábeis (Histórico do Salário Mínimo): https://www.contabeis.com.br/tabelas/salario-minimo

Consulte a seção "Ficha Técnica" dentro da aplicação para mais detalhes sobre os dados (Datasheet & Model Card).

Autor

Leonardo Moura Rebouças

https://www.linkedin.com/in/leonardo-moura-rebouças-1583191b0

lhomoura@gmail.com
