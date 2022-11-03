import * as fs from "fs";
import * as path from "path";
import Seven from "node-7z";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    //console.log(err)
});

class LeituraLogs {
    async unzip(file){
        const [prefix, id] = path.basename(file).split("-");
        const logTxt = path.basename(file);
        const removeRoot = file.replace(path.resolve("./"), "").replace("/DownloadLogs/downloads/", "");
        const [State, filename] = removeRoot.split("/");
        const unzipDir = path.resolve("./tmp") + '/' + id.replace(".logjez", "");
        let CSVFilename = null;
        let CSVTimeoutAnalise = path.resolve(`./LogsParsed/votoTimeoutCurto.csv`);

        if(!await fs.existsSync(CSVTimeoutAnalise))
            await fs.writeFileSync(CSVTimeoutAnalise, "UF,MUN,ZONA,SECAO,SERIAL,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR, DIFF_COMPUTADO, DIFF_DIGITATITULO, SOLICITADIGITAL, TENTATIVAS_DIGITAL\n");
                
        if(!await fs.existsSync(unzipDir))
            await fs.mkdirSync(unzipDir);

        if(!await fs.existsSync(path.resolve(`./LogsParsed/${State}`)))
            await fs.mkdirSync(path.resolve(`./LogsParsed/${State}`));

        await new Promise(async (resolve, reject) => {
            try{
                let logSummary = {
                    municipio: null,
                    zona: null,
                    secao: null,
                    serialMR: null,
                    "logs": []
                };

                const archive = Seven.extractFull(file, unzipDir, {
                    $progress: false
                }); 

                archive.on('end', async () => {
                    const bufferISO = await fs.readFileSync(`${unzipDir}/logd.dat`, "latin1");
                    await fs.writeFileSync(path.resolve(`./LogsParsed/${State}/${logTxt.replace(".logjez", ".txt")}`), bufferISO, "utf-8");
                    const lines = bufferISO.split("\n");

                    let awaitVoto = null;
                    let eleitorHabilitado = null;
                    let finishVoto = null;
                    let lastVoto = null;
                    let mesarioDigitandoTitulo = null;
                    let solicitacaoDigital = false;
                    let digitalTentativas = 0;

                    for(let line of lines){
                        if(logSummary.municipio && logSummary.zona && logSummary.secao && !CSVFilename){
                            CSVFilename = path.resolve(`./LogsParsed/${State}/${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.csv`);
        
                            if(await fs.existsSync(CSVFilename))
                                await fs.unlinkSync(CSVFilename)
                            
                            await fs.writeFileSync(CSVFilename, "UF,MUN,ZONA,SECAO,SERIAL,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR, DIFF_COMPUTADO, DIFF_DIGITATITULO, SOLICITADIGITAL, TENTATIVAS_DIGITAL\n");
                        }

                        const [dataHora, logLevel, cod, logRef, logDesc, logSign] = line.split("	");
                        const [data, hora] = dataHora.split(" ");

                        if(data == "30/10/2022"){
                            let type = null;
                                                        
                            switch(logDesc){
                                case "Início das operações do logd": type = "STARTLOG"; break;
                                case "Gerando relatório [ZERÉSIMA] [INÍCIO]": type = "ZERESIMA"; break;
                                case "Urna pronta para receber votos": type = "STARVOTOS"; break;
                                case "Título digitado pelo mesário": mesarioDigitandoTitulo = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                                case "Aguardando digitação do título": awaitVoto = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                                case "Eleitor foi habilitado": eleitorHabilitado = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                                case "O voto do eleitor foi computado": finishVoto = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                            }

                            if(logDesc.includes("Município:"))
                                logSummary.municipio = logDesc.replace("Município: ", "");
                            else if(logDesc.includes("Zona Eleitoral:"))
                                logSummary.zona = logDesc.replace("Zona Eleitoral: ", "");
                            else if(logDesc.includes("Seção Eleitoral: "))
                                logSummary.secao = logDesc.replace("Seção Eleitoral: ", "");
                            else if(logDesc.includes("Número de série da MR: "))
                                logSummary.serialMR = logDesc.replace("Número de série da MR: ", "");
                            else if(logDesc.includes("Solicita digital ")){
                                solicitacaoDigital = true;
                                digitalTentativas++;
                            }

                            //console.log(awaitVoto, finishVoto);

                            if(type){
                                logSummary.logs.push({
                                    data: data,
                                    hora: hora,
                                    cod: cod,
                                    desc: logDesc,
                                    sign: logSign,
                                    type
                                });
                            }    
                            else if(awaitVoto && finishVoto){
                                const dateVotoAnterior = (lastVoto) ? new Date(this.convertData(lastVoto)).getTime() : null;
                                const dateHabilitacao = new Date(this.convertData(eleitorHabilitado.dataHora)).getTime();
                                const dateVotoComputador = new Date(this.convertData(finishVoto.dataHora)).getTime();
                                const diffTimeDigitandoTitulo = (mesarioDigitandoTitulo) ? (dateHabilitacao - new Date(this.convertData(mesarioDigitandoTitulo.dataHora)).getTime()) / 1000 : null;

                                logSummary.logs.push({
                                    dataHoraVotoAnterior: lastVoto,
                                    dataHoraLiberacaoUrna: awaitVoto.dataHora,
                                    signLiberacaoUrna: awaitVoto.logSign,
                                    dataHoraTituloDigitado: mesarioDigitandoTitulo.dataHora,
                                    signTituloDigitado: mesarioDigitandoTitulo.logSign,
                                    dataHoraHabilitacaoEleitor: eleitorHabilitado.dataHora,
                                    signHabilitacaoEleitor: eleitorHabilitado.logSign,
                                    dataHoraVotoComputado: finishVoto.dataHora,
                                    signVotoComputado: finishVoto.logSign,
                                    diffTimeDigitandoTitulo: diffTimeDigitandoTitulo,
                                    diffTimeHabilitacaoComputado: (dateVotoComputador - dateHabilitacao) / 1000,
                                    dffTimeVotoAnteriorHabilitacao: (dateVotoComputador - dateVotoAnterior) / 1000,
                                    diffTimeHabilitacaoComputadoStr: this.timerToString((dateVotoComputador - dateHabilitacao) / 1000),
                                    dffTimeVotoAnteriorHabilitacaoStr: this.timerToString((dateVotoComputador - dateVotoAnterior) / 1000),
                                    diffTimeDigitandoTituloStr: (diffTimeDigitandoTitulo) ? this.timerToString(diffTimeDigitandoTitulo) : null,
                                    solicitacaoDigital,
                                    digitalTentativas
                                });

                                let reportCSVObject = [
                                    State,
                                    logSummary.municipio, logSummary.zona, logSummary.secao, logSummary.serialMR,
                                    lastVoto, awaitVoto.dataHora, awaitVoto.logSign, mesarioDigitandoTitulo.dataHora,
                                    mesarioDigitandoTitulo.logSign, eleitorHabilitado.dataHora, eleitorHabilitado.logSign,
                                    finishVoto.dataHora, finishVoto.logSign, this.timerToString((dateVotoComputador - dateVotoAnterior) / 1000),
                                    this.timerToString((dateVotoComputador - dateHabilitacao) / 1000), (diffTimeDigitandoTitulo) ? this.timerToString(diffTimeDigitandoTitulo) : null,
                                    solicitacaoDigital, digitalTentativas
                                ];

                                if(CSVFilename)
                                    await fs.appendFileSync(CSVFilename, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");

                                if(((dateVotoComputador - dateVotoAnterior) / 1000) <= 40)
                                    await fs.appendFileSync(CSVTimeoutAnalise, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                                
                                lastVoto = finishVoto.dataHora;
                                awaitVoto = null;
                                eleitorHabilitado = null;
                                finishVoto = null;
                                solicitacaoDigital = false;
                                digitalTentativas = 0;
                            }                       
                        }
                    }

                    await fs.writeFileSync(path.resolve(`./LogsParsed/${State}/${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.json`), JSON.stringify(logSummary, null, 4), "utf-8");
                    await fs.rmSync(unzipDir, { recursive: true, force: true });
                    resolve();
                });
            }
            catch(e){
                resolve();
            }
        }); 
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
    const files = await fg("./DownloadLogs/downloads/AC/*.logjez", { onlyFiles: true });
    const leituraLogs = new LeituraLogs();

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(files.length, 0);

    for(let log of files){
        bar1.increment();  

        try{ await leituraLogs.unzip(path.resolve(log)); }
        catch(e){}
    }
})();
