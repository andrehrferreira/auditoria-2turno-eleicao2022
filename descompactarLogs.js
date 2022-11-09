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

        if(!await fs.existsSync(path.resolve(`./LogsParsed/${State}`)))
            await fs.mkdirSync(path.resolve(`./LogsParsed/${State}`));

        await new Promise(async (resolve, reject) => {
            try{
                const logTxtFilename = path.resolve(`./LogsParsed/${State}/${logTxt.replace(".logjez", ".txt")}`);

                if(!await fs.existsSync(logTxtFilename)){
                    if(!await fs.existsSync(unzipDir))
                        await fs.mkdirSync(unzipDir);

                    const archive = Seven.extractFull(file, unzipDir, { $progress: false }); 

                    archive.on('error', async (err) => { 
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){}
                        resolve(); 
                    });

                    archive.on('end', async () => {
                        const bufferISO = await fs.readFileSync(`${unzipDir}/logd.dat`, "latin1");
                        await fs.writeFileSync(logTxtFilename, bufferISO, "utf-8");
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){}                        
                        resolve();
                    });
                } 
                else{
                    resolve();
                }              
            }
            catch(e){
                resolve();
            }
        }); 
    }
}

(async () => {
    const UFs = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO", "ZZ"];

    for await(let UF of UFs){
        const files = await fg(`./DownloadLogs/downloads/${UF}/*.logjez`, { onlyFiles: true });
        const leituraLogs = new LeituraLogs();

        const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar1.start(files.length, 0);

        let CSVTimeoutAnalise = path.resolve(`./LogsParsed/votoTimeoutCurto-${UF}.csv`);
        let CSVTimeoutImprovavel = path.resolve(`./LogsParsed/votoTimeoutImprovavel-${UF}.csv`);

        if(await fs.existsSync(CSVTimeoutAnalise))
            await fs.unlinkSync(CSVTimeoutAnalise);

        if(await fs.existsSync(CSVTimeoutImprovavel))
            await fs.unlinkSync(CSVTimeoutImprovavel);

        let promises = [];

        for(let log of files){
            bar1.increment();  

            promises.push(new Promise(async (resolve, reject) => {
                await leituraLogs.unzip(path.resolve(log));
                resolve();
            }));

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
