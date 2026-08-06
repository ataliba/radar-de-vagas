class EmpresasNovasController < ApplicationController
  def index
    @pagy, @empresas_novas = pagy(EmpresaNova.order(vagas_total: :desc), limit: 50)
  end
end
