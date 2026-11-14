class KanbanColunasController < ApplicationController
  include KanbanEditavel

  before_action :exigir_kanban_editavel
  before_action :carregar_coluna, only: [ :update, :destroy, :mover ]

  def create
    coluna = KanbanColuna.new(coluna_params)

    if coluna.save
      redirect_to kanban_path, notice: "Coluna \"#{coluna.nome}\" criada."
    else
      redirect_to kanban_path, alert: coluna.errors.full_messages.to_sentence
    end
  end

  def update
    if @coluna.update(coluna_params)
      redirect_to kanban_path, notice: "Coluna \"#{@coluna.nome}\" atualizada."
    else
      redirect_to kanban_path, alert: @coluna.errors.full_messages.to_sentence
    end
  end

  def mover
    @coluna.mover!(params[:direcao] == "esquerda" ? -1 : 1)
    redirect_to kanban_path
  end

  def destroy
    destino = KanbanColuna.find_by(id: params[:destino_id])

    if @coluna.apagar_movendo_para!(destino)
      redirect_to kanban_path, notice: "Coluna \"#{@coluna.nome}\" apagada."
    else
      redirect_to kanban_path, alert: "A coluna \"#{@coluna.nome}\" tem vagas: escolha pra qual coluna elas vão antes de apagar."
    end
  end

  private

  def carregar_coluna
    @coluna = KanbanColuna.find(params[:id])
  end

  def coluna_params
    params.require(:kanban_coluna).permit(:nome, :encerra)
  end
end
