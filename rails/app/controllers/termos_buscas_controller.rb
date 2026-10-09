class TermosBuscasController < ApplicationController
  # /termos_busca.json é o que o scraper consulta antes de cada rodada (ver
  # busca-vagas-gupy-inhire/busca_vagas/extrair_termos.js) — sem paginação,
  # sempre a lista de termos ativos.
  def show
    respond_to do |format|
      format.html do
        @preset_ativo = TermoBusca::PRESETS.find { |p| TermoBusca.where(origem: p, ativo: true).exists? } || "preset_devops"
        @termos_custom = TermoBusca.custom.order(:termo)
        @termos_ativos = TermoBusca.ativo.order(:termo)
      end
      format.json { render json: TermoBusca.ativo.order(:termo).as_json(only: [ :termo, :rotulo ]) }
    end
  end

  def update
    preset = params[:preset]
    return redirect_to(termos_busca_path, alert: "Preset inválido.") unless TermoBusca::PRESETS.include?(preset)

    TermoBusca.where(origem: TermoBusca::PRESETS - [ preset ]).update_all(ativo: false)
    TermoBusca.where(origem: preset).update_all(ativo: true)

    TermoBusca.custom.destroy_all
    termos_customizados.each do |termo|
      TermoBusca.create!(termo: termo, rotulo: termo, origem: "custom", ativo: true)
    end

    redirect_to termos_busca_path, notice: "Configuração de termos de busca atualizada."
  end

  private

  def termos_customizados
    params[:termos_customizados].to_s.split(",").map(&:strip).reject(&:blank?).uniq
  end
end
