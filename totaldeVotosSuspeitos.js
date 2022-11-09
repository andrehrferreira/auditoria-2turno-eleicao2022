import * as fs from "fs";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

process.on('uncaughtException', function(err) {
    console.log(err)
});

class TotalDeVotosSuspeitos {
    /*async loadDatabase(){
        this.db = await open({
            filename: './turn2.sqlite',
            driver: sqlite3.Database
        });
    }*/

    async verificar(files, UF){
        let votos = { abaixode40: 0, abaixode20: 0 };

        for(let file of files){
            const data = JSON.parse(await fs.readFileSync(file, "utf-8"));

            for(let voto of data.logs){
                if(voto.dataHoraVotoAnterior){
                    if(voto.dffTimeVotoAnteriorHabilitacao <= 40){
                        if(!votos["abaixode40"])
                            votos["abaixode40"] = 0;

                        votos["abaixode40"]++
                    }

                    if(voto.dffTimeVotoAnteriorHabilitacao <= 20){
                        if(!votos["abaixode20"])
                            votos["abaixode20"] = 0;

                        votos["abaixode20"]++
                    }
                }
            }
        }

        await fs.writeFileSync(`./LogsParsed/_VotosSuspeitos/${UF}.json`, JSON.stringify(votos, null, 4));
    }
}

(async () => {
    const UFs = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO", "ZZ"];
    const totalDeVotosSuspeitos = new TotalDeVotosSuspeitos();
    //await totalDeVotosSuspeitos.loadDatabase();

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(UFs.length, 0);

    for(let UF of UFs) {
        const files = await fg(`./LogsParsed/${UF}/*.json`, { onlyFiles: true });
        bar1.increment(); 

        if(files.length > 0)
            await totalDeVotosSuspeitos.verificar(files, UF);
    }

    process.exit(1);
})();