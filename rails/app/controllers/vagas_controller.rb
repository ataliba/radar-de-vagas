class VagasController < ApplicationController
  ORDENACOES = {
    "detectado_em" => "vagas.detectado_em DESC, vagas.id ASC",
    "publicado" => "vagas.publicado DESC, vagas.id ASC"
  }.freeze

  def index
    @cargo_categorias = Vaga.distinct.order(:cargo_categoria).pluck(:cargo_categoria).compact
    @plataformas = Vaga::PLATAFORMAS
    @sort = ORDENACOES.key?(params[:sort]) ? params[:sort] : "detectado_em"
    @stats = Vaga.stats_gerais

    scope = Vaga.order(Arel.sql(ORDENACOES.fetch(@sort)))
    scope = scope.buscar(params[:q]) if params[:q].present?
    scope = scope.where(plataforma: params[:plataforma]) if params[:plataforma].present?
    scope = scope.where(na_lista: params[:na_lista]) if params[:na_lista].present?
    scope = scope.where(cargo_categoria: params[:cargo_categoria]) if params[:cargo_categoria].present?
    scope = scope.where(status: params[:status]) if params[:status].present?
    scope = scope.where.not(alerta: [ nil, "" ]) if params[:alerta] == "1"

    @pagy, @vagas = pagy(scope, limit: 20)
  end

  def enviar
    vagas = Vaga.where(id: Array(params[:vaga_ids]), status: "detectado")
    cliente = JobSyncClient.new

    resultados = vagas.map do |vaga|
      resultado = cliente.enviar_vaga(vaga)
      vaga.update!(status: "enviada", jobsync_job_id: resultado.job_id, enviado_em: Time.current) if resultado.sucesso
      [ vaga, resultado ]
    end

    sucesso = resultados.count { |_, r| r.sucesso }
    falha = resultados.size - sucesso

    if resultados.empty?
      redirect_to vagas_path, alert: "Nenhuma vaga selecionada."
    elsif falha.zero?
      redirect_to vagas_path, notice: "#{sucesso} vaga(s) enviada(s) pro JobSync."
    else
      detalhes = resultados.reject { |_, r| r.sucesso }.map { |vaga, r| "#{vaga.titulo_vaga}: #{r.mensagem}" }.join(" | ")
      redirect_to vagas_path, alert: "#{sucesso} enviada(s), #{falha} falharam — #{detalhes}"
    end
  rescue JobSyncClient::Erro => e
    redirect_to vagas_path, alert: "JobSync não configurado: #{e.message}"
  end

  def marcar_nao_aplicavel
    vagas = Vaga.where(id: Array(params[:vaga_ids]), status: "detectado")
    total = vagas.update_all(status: "nao_aplicavel")

    if total.zero?
      redirect_to vagas_path, alert: "Nenhuma vaga selecionada."
    else
      redirect_to vagas_path, notice: "#{total} vaga(s) marcada(s) como não aplicável."
    end
  end
end
