import * as fs from "fs";
import * as path from "path";
import Seven from "node-7z";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import argv from "argv";

process.on('uncaughtException', function(err) {
    console.log(err)
});

const args = argv.option({
    name: 'uf',
    short: 'u',
    type: 'str',
    description: 'Estado especifico a ser processado',
    example: "'node processJson.js --uf=ES' or 'node processJson.js -u ES'"
}).run();

class LeituraLogs {
    async loadDatabase(){
        this.db = await open({
            filename: './turn2.sqlite',
            driver: sqlite3.Database
        });
    }

    async unzip(file, UF, counter, total){
        let CSVTimeoutAnalise = path.resolve(`./LogsParsed/votoTimeoutCurto-${UF}.csv`);
        let CSVTimeoutImprovavel = path.resolve(`./LogsParsed/votoTimeoutImprovavel-${UF}.csv`);

        if(!await fs.existsSync(CSVTimeoutAnalise))
            await fs.writeFileSync(CSVTimeoutAnalise, "UF,CD_MUN,NM_MUN,CD_ZONA,CD_SECAO,SERIAL,MODELOURNA,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR,DIFF_COMPUTADO,DIFF_DIGITATITULO,SOLICITADIGITAL,TENTATIVAS_DIGITAL,VOTOS_PT,VOTOS_PL\n");
        
        if(!await fs.existsSync(CSVTimeoutImprovavel))
            await fs.writeFileSync(CSVTimeoutImprovavel, "UF,CD_MUN,NM_MUN,CD_ZONA,CD_SECAO,SERIAL,MODELOURNA,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR,DIFF_COMPUTADO,DIFF_DIGITATITULO,SOLICITADIGITAL,TENTATIVAS_DIGITAL,VOTOS_PT,VOTOS_PL\n");
                            
        await new Promise(async (resolve, reject) => {
            try{
                if(await fs.existsSync(file)){
                    const logJSON = JSON.parse(await fs.readFileSync(file, "utf-8"));
                    await this.parseJSON(logJSON, CSVTimeoutAnalise, CSVTimeoutImprovavel, UF);
                    console.log(`Lendo ${file} - ${counter} / ${total}`);
                }      
                
                resolve();
            }
            catch(e){
                console.log(e);
                resolve();
            }
        }); 
    }

    async parseJSON(data, CSVTimeoutAnalise, CSVTimeoutImprovavel, UF){
        for(let log of data.logs){
            if(log.dataHoraVotoAnterior){
                const result = await this.db.get(`SELECT * 
                FROM votes 
                WHERE SG_UF="${UF}" 
                AND CD_MUNICIPIO="${parseInt(data.municipio)}" 
                AND NR_ZONA="${parseInt(data.zona)}" 
                AND NR_SECAO="${parseInt(data.secao)}"
                LIMIT 1`);

                if(result){
                    let reportCSVObject = [
                        UF, data.municipio, result.NM_MUNICIPIO, data.zona, data.secao, data.serialMR, data.modeloUrna,
                        log.dataHoraVotoAnterior, log.dataHoraLiberacaoUrna, log.signLiberacaoUrna, log.dataHoraTituloDigitado,
                        log.signTituloDigitado, log.dataHoraHabilitacaoEleitor, log.signHabilitacaoEleitor,
                        log.dataHoraVotoComputado, log.signVotoComputado, log.dffTimeVotoAnteriorHabilitacaoStr, 
                        log.diffTimeHabilitacaoComputadoStr, log.diffTimeDigitandoTituloStr,
                        log.solicitacaoDigital, log.digitalTentativas, result.VOTOS_PT, result.VOTOS_PL,
                    ];
        
                    if(log.dffTimeVotoAnteriorHabilitacao <= 40)
                        await fs.appendFileSync(CSVTimeoutAnalise, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                    
                    if(log.dffTimeVotoAnteriorHabilitacao <= 20)
                        await fs.appendFileSync(CSVTimeoutImprovavel, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                }
            }
        }
    }

    convertData(dataHora){
        if(typeof dataHora == "string"){
            const [data, hora] = dataHora.split(" ");
            const [dia, mes, ano] = data.split("/");
            return `${ano}-${mes}-${dia} ${hora}`;
        }
        else{
            return ""
        }
    }

    timerToString(time){
        if(time < 60)
            return `${time} seg`;
        if(time > 60 && time < 3600)
            return `${(time/60).toFixed(0)} min`;
        if(time > 3600)
            return `${(time/3600).toFixed(0)} h`;
    }
}

(async () => {
    let UFs = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO", "ZZ"];
    
    if(args.options.uf)
        UFs = [args.options.uf];
        
    const leituraLogs = new LeituraLogs();
    await leituraLogs.loadDatabase();

    for await(let UF of UFs){
        const files = await fg(`./LogsParsed/${UF}/*.json`, { onlyFiles: true });
        
        let CSVTimeoutAnalise = path.resolve(`./LogsParsed/votoTimeoutCurto-${UF}.csv`);
        let CSVTimeoutImprovavel = path.resolve(`./LogsParsed/votoTimeoutImprovavel-${UF}.csv`);

        if(await fs.existsSync(CSVTimeoutAnalise))
            await fs.unlinkSync(CSVTimeoutAnalise);

        if(await fs.existsSync(CSVTimeoutImprovavel))
            await fs.unlinkSync(CSVTimeoutImprovavel);

        let promises = [];
        let counter = 0;

        for(let logJSON of files){
            counter++;
            
            promises.push(leituraLogs.unzip(path.resolve(logJSON), UF, counter, files.length));

            if(promises.length == 100){
                await Promise.all(promises);
                promises = [];
            } 
        }

        if(promises.length > 0){
            await Promise.all(promises);
            promises = [];
        }
    }
    
    process.exit(1);
})();
