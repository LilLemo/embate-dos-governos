# Publicar o Embate dos Governos no GitHub e na Vercel

O pacote `Embate_dos_Governos_GitHub_Vercel.zip` já está organizado para publicação estática. Não é necessário instalar dependências, executar comandos ou configurar uma API.

## 1. Atualizar o GitHub

1. Baixe e extraia o arquivo ZIP.
2. Abra o repositório `LilLemo/embate-dos-governos-01` no GitHub.
3. Entre em **Add file > Upload files**.
4. Arraste **o conteúdo extraído**, incluindo as pastas `fonts`, `portraits` e `scripts`.
5. Confirme em **Commit changes**.

O site novo fica dentro da pasta `dist`. Os arquivos antigos `script.js`, `servidor_ia.py`, `requirements.txt` e `dados_analiticos.db` não são usados pela nova versão e podem ser removidos do repositório depois da atualização.

## 2. Publicar na Vercel

1. Acesse [vercel.com](https://vercel.com/) e entre com o GitHub.
2. Clique em **Add New > Project**.
3. Importe `LilLemo/embate-dos-governos-01`.
4. Em **Framework Preset**, selecione **Other**.
5. Deixe **Build Command** vazio.
6. Deixe **Output Directory** como veio preenchido. O arquivo `vercel.json` já aponta para a pasta `dist`.
7. Clique em **Deploy**.

O arquivo `vercel.json` já contém a configuração necessária para o site estático.

## Atualizações futuras

Para atualizar o site, substitua os arquivos no mesmo repositório e confirme um novo commit. Quando o projeto está conectado ao GitHub, a Vercel publica automaticamente cada atualização enviada para a branch principal.
