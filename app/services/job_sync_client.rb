# Envia vagas pro JobSync (github.com/Gsync/jobsync) via o servidor MCP dele
# (POST /api/mcp, JSON-RPC 2.0, modo stateless). Usa a tool "add_job" com
# upsert:true, então reenviar a mesma vaga (mesma jobUrl) atualiza em vez de duplicar.
class JobSyncClient
  Erro = Class.new(StandardError)

  Resultado = Struct.new(:sucesso, :job_id, :duplicado, :mensagem, keyword_init: true)

  def initialize(base_url: ENV["JOBSYNC_URL"], token: ENV["JOBSYNC_TOKEN"])
    @base_url = base_url.to_s.chomp("/")
    @token = token
  end

  def enviar_vaga(vaga)
    raise Erro, "JOBSYNC_URL não configurada" if @base_url.blank?
    raise Erro, "JOBSYNC_TOKEN não configurada" if @token.blank?

    resposta = conexao.post("/api/mcp") do |req|
      req.body = {
        jsonrpc: "2.0",
        id: SecureRandom.uuid,
        method: "tools/call",
        params: { name: "add_job", arguments: argumentos_para(vaga) }
      }.to_json
    end

    interpretar(resposta)
  rescue Faraday::Error => e
    Resultado.new(sucesso: false, mensagem: "Falha de conexão com JobSync: #{e.message}")
  end

  private

  def conexao
    Faraday.new(url: @base_url) do |f|
      f.request :authorization, "Bearer", @token
      f.request :json
      f.headers["Accept"] = "application/json, text/event-stream"
      f.response :json, content_type: /\bjson$/
      f.adapter Faraday.default_adapter
    end
  end

  def argumentos_para(vaga)
    {
      company: vaga.empresa,
      jobTitle: vaga.titulo_vaga,
      jobDescription: descricao_para(vaga),
      location: vaga.local.presence,
      source: vaga.plataforma,
      jobUrl: vaga.link,
      tags: [ vaga.cargo_categoria ].compact.presence,
      upsert: true
    }.compact
  end

  # Não guardamos a descrição completa da vaga no scraping — manda um resumo
  # estruturado com o que temos. O link original fica de referência pro
  # candidato completar manualmente lá no JobSync se precisar.
  def descricao_para(vaga)
    [
      "Vaga: #{vaga.titulo_vaga}",
      "Empresa: #{vaga.empresa}",
      vaga.cargo_categoria.presence && "Categoria: #{vaga.cargo_categoria}",
      vaga.tipo.presence && "Tipo: #{vaga.tipo}",
      vaga.local.presence && "Local: #{vaga.local}",
      "Detectada via #{vaga.plataforma} em #{vaga.detectado_em}.",
      "Anúncio original: #{vaga.link}"
    ].compact.join("\n")
  end

  def interpretar(resposta)
    body = resposta.body

    unless body.is_a?(Hash)
      return Resultado.new(sucesso: false, mensagem: "Resposta inesperada do JobSync (HTTP #{resposta.status}).")
    end

    if body["error"]
      erro = body["error"]
      mensagem = erro.is_a?(Hash) ? erro["message"] : erro.to_s
      return Resultado.new(sucesso: false, mensagem: mensagem.presence || "Erro desconhecido do JobSync.")
    end

    texto = body.dig("result", "content", 0, "text")
    if texto.blank?
      return Resultado.new(sucesso: false, mensagem: "Resposta sem conteúdo do JobSync (HTTP #{resposta.status}).")
    end

    # "Job created (id: <uuid>)", "Job <uuid> updated.", "... existing job ... (id: <uuid>)"
    # e "No fields to update for job <uuid>." usam formatos diferentes — casa o UUID
    # onde aparecer em vez de depender de um template fixo.
    job_id = texto[/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i, 1]
    duplicado = texto.start_with?("Duplicate detected") || texto.include?(" updated.") || texto.start_with?("No fields to update")

    if job_id
      Resultado.new(sucesso: true, job_id: job_id, duplicado: duplicado, mensagem: texto)
    else
      Resultado.new(sucesso: false, mensagem: texto)
    end
  end
end
