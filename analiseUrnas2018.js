import * as fs from "fs";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    //console.log(err)
});

class AnaliseUrnas2018{
    async readBU(BU){
        const files = aw;
    }
}

(async () => {
    const BUs = await fg(`./2 Turno 2018/*.csv`, { onlyFiles: true });
    const analiseUrnas2018 = new AnaliseUrnas2018();

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(BUs.length, 0);

    for(let BU of BUs) {
        bar1.increment(); 

        if(files.length > 0){
            try{ await analiseUrnas2018.readBU(BU); }
            catch(e){}
        }
    }

    process.exit(1);
})();