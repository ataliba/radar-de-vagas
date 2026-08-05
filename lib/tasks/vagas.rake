namespace :vagas do
  desc "Importa vagas_final.json, presence_combined.json e inhire_new_companies.json do pipeline do maninho"
  task import: :environment do
    source_dir = Pathname.new(
      ENV.fetch("VAGAS_SOURCE_DIR") { Rails.root.join("..", "busca-vagas-gupy-inhire", "busca_vagas") }
    )

    vagas_criadas = vagas_atualizadas = 0

    ler_json(source_dir, "vagas_final.json").each do |item|
      vaga = Vaga.find_or_initialize_by(link: item["link"])
      novo = vaga.new_record?

      vaga.assign_attributes(
        empresa: nome_empresa_limpo(item),
        plataforma: item["plataforma"],
        na_lista: item["na_lista"],
        cargo_categoria: item["cargo_categoria"],
        titulo_vaga: item["titulo_vaga"],
        tipo: item["tipo"],
        local: item["local"],
        nome_na_plataforma: item["nome_na_plataforma"],
        publicado: item["publicado"],
        alerta: item["alerta"],
        detectado_em: item["detectado_em"]
      )

      vaga.save!
      novo ? vagas_criadas += 1 : vagas_atualizadas += 1
    end

    presencas_upsert = ler_json(source_dir, "presence_combined.json")
      .uniq { |item| item["empresa"] }
      .map do |item|
        {
          empresa: item["empresa"],
          gupy: item["gupy"],
          gupy_url: item["gupy_url"],
          inhire: item["inhire"],
          inhire_url: item["inhire_url"],
          inhire_vagas_total: item["inhire_vagas_total"],
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    Presenca.upsert_all(presencas_upsert, unique_by: :index_presencas_on_empresa) if presencas_upsert.any?

    novas_upsert = ler_json(source_dir, "inhire_new_companies.json")
      .uniq { |item| item["empresa"] }
      .map do |item|
        {
          empresa: item["empresa"],
          vagas_total: item["vagas_total"],
          url: item["url"],
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    EmpresaNova.upsert_all(novas_upsert, unique_by: :index_empresa_novas_on_empresa) if novas_upsert.any?

    puts "Vagas: #{vagas_criadas} criadas, #{vagas_atualizadas} atualizadas."
    puts "Presenças: #{presencas_upsert.size}. Empresas novas InHire: #{novas_upsert.size}."
  end

  def ler_json(dir, filename)
    path = dir.join(filename)
    raise "Arquivo não encontrado: #{path}" unless File.exist?(path)

    JSON.parse(File.read(path))
  end

  # Gupy usa o "careerPageName" (texto livre que a empresa escreve) como nome —
  # às vezes é slogan de campanha de RH ("#SejaVeriter", "VENHA SER #SANGUELARANJA 🧡🚀")
  # em vez do nome da empresa. Nesses casos, deriva o nome do subdomínio da URL da vaga.
  def nome_empresa_limpo(item)
    bruto = item["empresa"].to_s
    return bruto unless bruto.include?("#")

    subdominio = item["link"].to_s[%r{https?://([a-z0-9-]+)\.(?:gupy\.io|inhire\.app)}i, 1]
    return bruto unless subdominio

    subdominio.split(/[-_]/).map(&:capitalize).join(" ")
  end
end
