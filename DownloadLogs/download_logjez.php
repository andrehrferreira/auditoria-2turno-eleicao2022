<?php
ini_set('memory_limit', 1024 * 1024 * 1024 * 5);

// docker run -it --rm -v $PWD:/home -w /home php:8.1-cli-alpine php download_logjez.php 

class BuildJson {
    
    private array $heads = [];
    private $db;

    private function head(string $fieldName):int
    {
        $pos = array_search($fieldName, $this->heads);

        return $pos === FALSE? -1 : $pos;
    }

    //
    public function run(string $filter)
    {
        //
        $csv_files_path = './data-source/';
        $csv_files = array_diff(scandir($csv_files_path), array('.', '..'));

        //
        $links = [];
        foreach($csv_files as $fileIndex => $file)
        {
            if (!str_contains($file, $filter))
            {
                continue;
            }

            echo "processando {$file}... \n\n";

            $current_file = "{$csv_files_path}{$file}";
            $total_lines = count(file($current_file));
            $line_index = -1;

            //
            $last_zona = -1;
            $last_secao = -1;
            $CD_MUNICIPIO = -1;
            
            //
            $open = fopen($current_file, "r");
            while (($data = fgetcsv($open, 0, ";")) !== FALSE)
            {
                $line_index++;

                //
                if ($line_index==0) {
                    $this->heads = $data;
                    continue;
                }

                //
                if (($last_secao != $data[$this->head('NR_SECAO')]) || ($last_zona != $data[$this->head('NR_ZONA')]) || ($CD_MUNICIPIO != $data[$this->head('CD_MUNICIPIO')]))
                {
                    //
                    $uf = $data[$this->head('SG_UF')];
                    $last_secao = $data[$this->head('NR_SECAO')];
                    $last_zona = $data[$this->head('NR_ZONA')];
                    $CD_MUNICIPIO = $data[$this->head('CD_MUNICIPIO')];

                    //
                    $nubu = str_pad($data[$this->head('CD_MUNICIPIO')], 5, "0", STR_PAD_LEFT);
                    $zn = str_pad($data[$this->head('NR_ZONA')], 4, "0", STR_PAD_LEFT);
                    $se = str_pad($data[$this->head('NR_SECAO')], 4, "0", STR_PAD_LEFT);

                    //
                    if (!file_exists("./downloads/{$uf}"))
                    {
                        mkdir("./downloads/{$uf}");
                    }

                    //
                    $targetFile = "./downloads/{$uf}/o00407-{$nubu}{$zn}{$se}.logjez";

                    //
                    echo "baixando {$targetFile}...";
                    if (file_exists($targetFile))
                    {
                        echo "já baixado\n";
                        continue;
                    }

                    //
                    $url = strtolower("https://resultados.tse.jus.br/oficial/ele2022/arquivo-urna/407/dados/{$uf}/{$nubu}/{$zn}/{$se}/p000407-{$uf}-m{$nubu}-z{$zn}-s{$se}-aux.json");
                    $aux = json_decode(file_get_contents($url));
                    $hash = $aux->hashes[0]->hash;

                    //
                    $urlBu = "https://resultados.tse.jus.br/oficial/ele2022/arquivo-urna/407/dados/ac/{$nubu}/{$zn}/{$se}/{$hash}/o00407-{$nubu}{$zn}{$se}.logjez";

                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $urlBu);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');

                    $headers = array();
                    $headers[] = 'Referer: https://resultados.tse.jus.br/oficial/app/index.html';
                    $headers[] = 'Accept: */*';
                    $headers[] = 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
                    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

                    $result = curl_exec($ch);
                    if (curl_errno($ch))
                    {
                        echo 'Error:' . curl_error($ch);
                    }
                    curl_close($ch);

                    file_put_contents($targetFile, $result);

                    echo "concluído!\n";

                    $data = null;
                }

                $file = null;
            }
        }
    }
}

(new BuildJson())->run($argv[1]??'.csv');