# Reparo pra quem instalou do zero antes da correção da issue #48: o
# db:prepare carregou o schema.rb sem rodar as migrations que semeiam termos e
# empresas, e o seeds.rb estava vazio — essas tabelas ficaram vazias.
#
# Presets de termos nunca são apagados pela aplicação (só ativados/desativados),
# então "nenhum preset" é o sinal de que a carga inicial nunca rodou. Só nesse
# caso as empresas também são semeadas: uma lista esvaziada de propósito numa
# instalação normal não é repovoada.
class RepararDadosIniciais < ActiveRecord::Migration[8.1]
  def up
    return if select_value("SELECT COUNT(*) FROM termos_busca WHERE origem IN ('preset_devops', 'preset_dados')").to_i.positive?

    agora = Time.current
    termos = { "devops" => [ "preset_devops", true ], "dados" => [ "preset_dados", false ] }.flat_map do |arquivo, (origem, ativo)|
      ler_json("termos_#{arquivo}.json").map do |t|
        "(#{quote(t["termo"])}, #{quote(t["rotulo"])}, #{quote(origem)}, #{quote(ativo)}, #{quote(agora)}, #{quote(agora)})"
      end
    end
    execute(<<~SQL)
      INSERT INTO termos_busca (termo, rotulo, origem, ativo, created_at, updated_at)
      VALUES #{termos.join(",\n")}
      ON CONFLICT (termo, origem) DO NOTHING
    SQL

    return if select_value("SELECT COUNT(*) FROM empresa_alvos").to_i.positive?

    empresas = ler_json("empresas_iniciais.json").map { |nome| "(#{quote(nome)}, #{quote(agora)}, #{quote(agora)})" }
    execute(<<~SQL)
      INSERT INTO empresa_alvos (empresa, created_at, updated_at)
      VALUES #{empresas.join(",\n")}
      ON CONFLICT (empresa) DO NOTHING
    SQL
  end

  def down
    # Dados, não estrutura: nada a desfazer.
  end

  private

  def ler_json(arquivo)
    JSON.parse(File.read(Rails.root.join("db/seed_data", arquivo)))
  end
end
