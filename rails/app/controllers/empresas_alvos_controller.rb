class EmpresasAlvosController < ApplicationController
  # /empresas_alvos.json é o que o scraper consulta antes de cada rodada
  # (ver busca-vagas-gupy-inhire/busca_vagas/extrair_empresas.js) — sem
  # paginação, sempre a lista inteira.
  def index
    respond_to do |format|
      format.html { @pagy, @empresas_alvos = pagy(EmpresaAlvo.order(:empresa), limit: 100) }
      format.json { render json: EmpresaAlvo.order(:empresa).pluck(:empresa) }
    end
  end

  def create
    empresa_alvo = EmpresaAlvo.new(empresa: params[:empresa])

    if empresa_alvo.save
      redirect_to empresas_alvos_path, notice: "\"#{empresa_alvo.empresa}\" adicionada."
    else
      redirect_to empresas_alvos_path, alert: empresa_alvo.errors.full_messages.to_sentence
    end
  end

  def destroy
    empresa_alvo = EmpresaAlvo.find(params[:id])
    empresa_alvo.destroy

    redirect_to empresas_alvos_path, notice: "\"#{empresa_alvo.empresa}\" removida."
  end
end
