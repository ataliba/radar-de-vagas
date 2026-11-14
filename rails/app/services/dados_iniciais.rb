# Carga inicial de uma instalação nova, chamada pelo db/seeds.rb.
#
# O entrypoint roda `bin/rails db:prepare`: em banco vazio ele carrega o
# schema.rb e roda o seeds.rb — as migrations não rodam, então o que elas
# inserem (presets de termos, empresas do xlsx, colunas do Kanban) não chegava
# em instalação nova (issue #48). Cada parte só carrega se ainda não houver
# nada, então rodar de novo não duplica.
module DadosIniciais
  SEED_DIR = Rails.root.join("db/seed_data")

  module_function

  def carregar!
    termos!
    empresas!
    kanban!
  end

  # Os dois presets ficam cadastrados; só o DevOps vem ativo (mesmo
  # comportamento da migration CreateTermosBusca).
  def termos!
    return if TermoBusca.where(origem: TermoBusca::PRESETS).exists?

    agora = Time.current
    linhas = { "devops" => [ "preset_devops", true ], "dados" => [ "preset_dados", false ] }.flat_map do |arquivo, (origem, ativo)|
      ler_json("termos_#{arquivo}.json").map do |t|
        { termo: t["termo"], rotulo: t["rotulo"], origem: origem, ativo: ativo, created_at: agora, updated_at: agora }
      end
    end
    TermoBusca.insert_all(linhas, unique_by: :index_termos_busca_on_termo_and_origem)
  end

  def empresas!
    return if EmpresaAlvo.exists?

    agora = Time.current
    linhas = ler_json("empresas_iniciais.json").map { |nome| { empresa: nome, created_at: agora, updated_at: agora } }
    EmpresaAlvo.insert_all(linhas, unique_by: :index_empresa_alvos_on_empresa)
  end

  def kanban!
    KanbanColuna.criar_padrao! unless KanbanColuna.exists?
  end

  def ler_json(arquivo)
    JSON.parse(File.read(SEED_DIR.join(arquivo)))
  end
end
