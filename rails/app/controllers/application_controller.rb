class ApplicationController < ActionController::Base
  include Pagy::Backend

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  before_action :autenticar_basic

  private

  # Sem BASIC_AUTH_USER/BASIC_AUTH_PASSWORD configuradas, o app fica aberto
  # (dev local). Em produção configure as duas. O scraper (container à
  # parte, sem navegador) manda as mesmas credenciais via curl/fetch nas
  # chamadas que faz pra cá — ver ImportsController e
  # busca_vagas/extrair_empresas.js.
  def autenticar_basic
    usuario = ENV["BASIC_AUTH_USER"]
    senha = ENV["BASIC_AUTH_PASSWORD"]
    return if usuario.blank? || senha.blank?

    authenticate_or_request_with_http_basic("Radar de vagas") do |u, s|
      ActiveSupport::SecurityUtils.secure_compare(u, usuario) &
        ActiveSupport::SecurityUtils.secure_compare(s, senha)
    end
  end
end
