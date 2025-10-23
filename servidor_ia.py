# Importa todas as bibliotecas necessárias

import pandas as pd
import json
import os
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from sqlalchemy import create_engine 
from flask_cors import CORS
# --- Importa as bibliotecas para o "estepe" ---
from openai import OpenAI 
from google.api_core import exceptions

# --- CONFIGURAÇÃO INICIAL ---

load_dotenv()

DB_URL = os.environ.get('DATABASE_URL', 'sqlite:///dados_analiticos.db')
# Cria o "motor" do banco de dados com base na URL
engine = create_engine(DB_URL)
HORAS_TRABALHO_MES = 220

# Configura a API do Gemini
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except Exception as e:
    print(f"AVISO: Não foi possível configurar a API do Gemini. Verifique a chave. Erro: {e}")

# --- Configura o cliente para a API do DeepSeek (estepe) ---
try:
    deepseek_client = OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com/v1"
    )
except Exception as e:
    print(f"AVISO: Não foi possível configurar a API do DeepSeek. Verifique a chave. Erro: {e}")


# Cria a aplicação Flask, que será o servidor
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
# --- FUNÇÃO 1: O CALCULISTA ---

def calcular_metricas(periodo_gov):
    sql_query = 'SELECT * FROM "dados_consolidados" WHERE "Governo" = %(gov_name)s'
    params = {'gov_name': periodo_gov}
    df = pd.read_sql_query(sql_query, engine, params=params)

    if df.empty:
        return None

    colunas_numericas = ['Salario', 'valor_nominal', 'salario_minimo_necessario']
    for col in colunas_numericas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        else:
            df[col] = pd.NA
    df.dropna(subset=['Salario', 'valor_nominal'], inplace=True)

    df['data'] = pd.to_datetime(df['data'])
    df = df.sort_values(by='data')

    media_salario = df['Salario'].mean()
    media_cesta = df['valor_nominal'].mean()
    media_smn = df['salario_minimo_necessario'].mean()
    
    smn_multiplicador = media_smn / media_salario if media_salario > 0 and pd.notna(media_smn) else 0
    
    salario_inicial = df['Salario'].iloc[0]
    salario_final = df['Salario'].iloc[-1]
    aumento_percentual_sm = ((salario_final - salario_inicial) / salario_inicial) * 100 if salario_inicial > 0 else 0

    horas_necessarias = (media_cesta / media_salario) * HORAS_TRABALHO_MES if media_salario > 0 else 0
    
    df['data_str'] = df['data'].dt.strftime('%Y-%m')
    dados_grafico_linha = {'labels': df['data_str'].tolist(),'salario': df['Salario'].tolist(),'cesta': df['valor_nominal'].tolist()}
    dados_pizza = { 'labels': ['Cesta Básica', 'Sobra'], 'valores': [(media_cesta / media_salario) * 100 if media_salario > 0 else 0, 100 - ((media_cesta / media_salario) * 100 if media_salario > 0 else 0)] }

    return {
        'nome': periodo_gov,
        'dados_grafico_linha': dados_grafico_linha,
        'dados_pizza': dados_pizza,
        'kpi_horas_trabalho': round(horas_necessarias, 2),
        'kpi_media_sm': f"R$ {media_salario:.2f}",
        'kpi_media_smn': f"R$ {media_smn:.2f}" if pd.notna(media_smn) else "N/A",
        'kpi_smn_multiplicador': f"{smn_multiplicador:.2f}x" if smn_multiplicador > 0 else "N/A",
        'kpi_aumento_percentual_sm': f"{aumento_percentual_sm:.2f}%"
    }

# ---  FUNÇÃO: O "ESTEPE" ---
# Função dedicada a chamar a API do DeepSeek se o Gemini falhar
def chamar_deepseek(prompt):
    print("AVISO: Limite do Gemini atingido. Acionando o estepe (DeepSeek)...")
    try:
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500 
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"ERRO: A chamada para o DeepSeek também falhou. Erro: {e}")
        return None 

# --- FUNÇÃO 2: O CÉREBRO DA APLICAÇÃO ---

@app.route('/api/comparar', methods=['POST'])
def comparar_governos():
    # Pega os nomes dos governos que o usuário escolheu no site
    dados_requisicao = request.json
    gov1_nome = dados_requisicao.get('gov1')
    gov2_nome = dados_requisicao.get('gov2')

    # Usa a função calculista para obter os dados de cada governo
    dados_gov1 = calcular_metricas(gov1_nome)
    dados_gov2 = calcular_metricas(gov2_nome)

    if not dados_gov1 or not dados_gov2:
        return jsonify({"erro": "Dados para um dos governos não encontrados"}), 404


    aumento_gov1 = float(dados_gov1['kpi_aumento_percentual_sm'][:-1])
    aumento_gov2 = float(dados_gov2['kpi_aumento_percentual_sm'][:-1])
    horas_gov1 = dados_gov1['kpi_horas_trabalho']
    horas_gov2 = dados_gov2['kpi_horas_trabalho']
    multiplicador_gov1 = float(dados_gov1['kpi_smn_multiplicador'][:-1]) if dados_gov1['kpi_smn_multiplicador'] != "N/A" else float('inf')
    multiplicador_gov2 = float(dados_gov2['kpi_smn_multiplicador'][:-1]) if dados_gov2['kpi_smn_multiplicador'] != "N/A" else float('inf')
    vencedor_aumento_sm = dados_gov1['nome'] if aumento_gov1 > aumento_gov2 else dados_gov2['nome']
    vencedor_horas = dados_gov1['nome'] if horas_gov1 < horas_gov2 else dados_gov2['nome']
    vencedor_smn = dados_gov1['nome'] if multiplicador_gov1 < multiplicador_gov2 else dados_gov2['nome']
    pontos = {dados_gov1['nome']: 0, dados_gov2['nome']: 0}
    pontos[vencedor_aumento_sm] += 1
    pontos[vencedor_horas] += 1
    pontos[vencedor_smn] += 1
    placar_final = f"Placar Final: {dados_gov1['nome'].upper()} {pontos[dados_gov1['nome']]} x {pontos[dados_gov2['nome']]} {dados_gov2['nome'].upper()}"
    vencedor_geral_label = "EMPATE"
    if pontos[dados_gov1['nome']] > pontos[dados_gov2['nome']]:
        vencedor_geral_label = f"VENCEDOR: {dados_gov1['nome'].upper()}"
    elif pontos[dados_gov2['nome']] > pontos[dados_gov1['nome']]:
        vencedor_geral_label = f"VENCEDOR: {dados_gov2['nome'].upper()}"


    prompt = f"""
    Aja como 'Dadinho', um carismático locutor de luta e analista de dados. Sua tarefa é narrar um "embate econômico" em rounds, com **parágrafos muito curtos e diretos (máximo 2 frases por parágrafo)**.

    **DADOS APURADOS PARA SUA NARRAÇÃO:**
    - GOVERNO A: {dados_gov1['nome'].upper()}
      - Aumento do Salário: {dados_gov1['kpi_aumento_percentual_sm']}
      - Horas de Trabalho p/ Cesta: {dados_gov1['kpi_horas_trabalho']} horas
      - SM vs. Necessário: {dados_gov1['kpi_smn_multiplicador']}

    - GOVERNO B: {dados_gov2['nome'].upper()}
      - Aumento do Salário: {dados_gov2['kpi_aumento_percentual_sm']}
      - Horas de Trabalho p/ Cesta: {dados_gov2['kpi_horas_trabalho']} horas
      - SM vs. Necessário: {dados_gov2['kpi_smn_multiplicador']}

    **RESULTADO DO JULGAMENTO (JÁ CALCULADO):**
    - Vencedor do Round 1 ('Aumento de Salário'): {vencedor_aumento_sm.upper()}
    - Vencedor do Round 2 ('Horas de Trabalho'): {vencedor_horas.upper()}
    - Vencedor do Round 3 ('Distância do Salário Necessário'): {vencedor_smn.upper()}
    - Placar Final: {placar_final}
    - Vencedor Geral: {vencedor_geral_label}

    **INSTRUÇÕES PARA SUA NARRAÇÃO:**
    1.  **Saudação:** Comece com uma única frase de saudação empolgada.
    2.  **Round 1 - Aumento Salarial:** Em um parágrafo muito curto (máximo 2 frases), anuncie o vencedor do Round 1, citando os percentuais de aumento.
    3.  **Round 2 - Horas de Trabalho:** Em outro parágrafo curto (máximo 2 frases), anuncie o vencedor do Round 2, comparando as horas de trabalho necessárias.
    4.  **Round 3 - Distância do Ideal:** Em um terceiro parágrafo curto (máximo 2 frases), anuncie o vencedor do Round 3, comparando o multiplicador 'x'.
    5.  **Veredito Final:** Em um parágrafo final, apresente o placar ({placar_final}) e o vencedor ({vencedor_geral_label}). Se o placar for 2x1, mencione que a "luta foi acirrada". Se um dos governos teve mandato curto (Dilma 2, Temer, Lula 3), comente isso brevemente.
    """ 
    
    # --- BLOCO DE LÓGICA: Tenta o Gemini, se falhar, tenta o DeepSeek ---
    texto_analise_ia = None
    try:
        # Tenta chamar a API principal (Gemini)
        print("Tentando a chamada principal (Gemini)...")
        model = genai.GenerativeModel('models/gemini-pro-latest')
        response = model.generate_content(prompt)
        texto_analise_ia = response.text
    except exceptions.ResourceExhausted as e:
        # Se a cota do Gemini estourar, chama a função do estepe (DeepSeek)
        print(f"AVISO: Cota do Gemini excedida. {e}")
        texto_analise_ia = chamar_deepseek(prompt)
    except Exception as e:
        # Se qualquer outro erro acontecer com o Gemini, também tenta o estepe
        print(f"AVISO: Erro inesperado na API do Gemini, tentando o estepe. Erro: {e}")
        texto_analise_ia = chamar_deepseek(prompt)

    # Se mesmo o estepe falhar, gera um texto padrão para o site não quebrar
    if texto_analise_ia is None:
        print("AVISO: Ambas as APIs falharam. Gerando texto padrão.")
        texto_analise_ia = (f"Olá, sou o Dadinho! Parece que meus circuitos de IA estão sobrecarregados hoje.\n\n"
                            f"Mas a análise numérica não para! O vencedor do round de 'Aumento Salarial' foi {vencedor_aumento_sm.upper()}.\n"
                            f"No round de 'Horas de Trabalho', o ponto foi para {vencedor_horas.upper()}.\n"
                            f"No round de 'Distância do Salário Ideal', o melhor foi {vencedor_smn.upper()}.\n\n"
                            f"{placar_final}")
    # --- FIM DO BLOCO DE LÓGICA ---

    # Empacota o resultado final para o site
    resultado_final = { 
        "governo1": dados_gov1, 
        "governo2": dados_gov2, 
        "analise_dadinho": texto_analise_ia,
        "vencedor": vencedor_geral_label 
    }
    return jsonify(resultado_final)

# Rota para servir o nosso site 
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Inicia o servidor quando o script é executado
if __name__ == '__main__':
    # --- MUDANÇA 4: Configuração do 'host' e 'port' ---
  
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
    # --- Fim da MUDANÇA 4 ---



