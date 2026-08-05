class PresencasController < ApplicationController
  def index
    @pagy, @presencas = pagy(Presenca.order(:empresa), limit: 50)
  end
end
