import * as fs from "fs";
import * as path from "path";
import Seven from "node-7z";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    //console.log(err)
});

class TempoMedioVotacao {
    async calcularMedia(files, UF){
        let totalDigitandoTitulo = 0;
        let totalHabilitacaoComputado = 0;
        let totalAnteriorHabilitacao = 0;
        let amount = 0;

        for(let file of files){
            const data = JSON.parse(await fs.readFileSync(file, "utf-8"));
            
            for(let voto of data.logs){
                if(voto.dataHoraVotoAnterior){
                    totalDigitandoTitulo += voto.diffTimeDigitandoTitulo;
                    totalHabilitacaoComputado += voto.diffTimeHabilitacaoComputado;
                    totalAnteriorHabilitacao += voto.dffTimeVotoAnteriorHabilitacao;
                    amount++;
                }
            }
        }

        const mediaDigitandoTitulo = totalDigitandoTitulo / amount;
        const mediaHabilitacaoComputado = totalHabilitacaoComputado / amount;
        const mediaAnteriorHabilitacao = totalAnteriorHabilitacao / amount;

        fs.writeFileSync(`./LogsParsed/TempoMedio/${UF}.json`, JSON.stringify({
            mediaDigitandoTitulo: this.timerToString(mediaDigitandoTitulo),
            mediaHabilitacaoComputado: this.timerToString(mediaHabilitacaoComputado),
            mediaAnteriorHabilitacao: this.timerToString(mediaAnteriorHabilitacao)
        }));
    }

    timerToString(time){
        if(time < 60)
            return `${time.toFixed(0)} seg`;
        if(time > 60 && time < 3600)
            return `${(time/60).toFixed(0)} min`;
        if(time > 3600)
            return `${(time/3600).toFixed(0)} h`;
    }
}

(async () => {
    const UFs = ["AC", "AL"];
    const tempoMedioVotacao = new TempoMedioVotacao();

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(UFs.length, 0);

    for(let UF of UFs) {
        const files = await fg(`./LogsParsed/${UF}/*.json`, { onlyFiles: true });
        bar1.increment(); 
        
        try{ await tempoMedioVotacao.calcularMedia(files, UF); }
        catch(e){}
    }

    process.exit(1);
})();