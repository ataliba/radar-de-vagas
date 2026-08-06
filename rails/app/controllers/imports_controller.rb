require "rake"

class ImportsController < ApplicationController
  # Chamado também pelo container do scraper (sem sessão/cookie) depois de
  # cada rodada — sem isso o CSRF padrão bloquearia esse POST máquina-a-máquina.
  skip_forgery_protection only: :create

  def create
    Rails.application.load_tasks unless Rake::Task.task_defined?("vagas:import")
    Rake::Task["vagas:import"].execute

    redirect_to vagas_path, notice: "Dados reimportados do pipeline."
  rescue StandardError => e
    redirect_to vagas_path, alert: "Falha ao reimportar: #{e.message}"
  end
end
