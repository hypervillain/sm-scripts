
const fs = require('fs');
const path = require('path');
const directoryPath = path.join(__dirname, 'content/export_old_docs');
const archiver = require('archiver');

function migrateContent() {

    //passsing directoryPath and callback function
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file, index) {
            // Do whatever you want to do with the file
            if (!file.startsWith(".")) {
                let fileData = require(path.join(__dirname, 'content/export_old_docs', file));
                if (fileData.body) {
                    fileData.body.forEach(function (slice) {
                        slice.value.variation = "default-slice"
                    //     slice.value.items = slice.value.repeat
                    //     delete slice.value.repeat
                    //     slice.value.primary = slice.value["non-repeat"]
                    //     delete slice.value["non-repeat"]
                    })
                    let str = JSON.stringify(fileData);
                    str = str.replace("\"body\":", "\"slices\":");
                    str = str.replaceAll("\"repeat\":", "\"items\":");
                    str = str.replaceAll("\"non-repeat\":", "\"primary\":");
                    fileData = JSON.parse(str);
                }
                if (fileData.type) {
                    fileData.type = fileData.type
                }
                //If there're locales, output the filename
                if(fileData.grouplang) {
                    fs.writeFile(path.join(__dirname, 'content/new_content', `new_${fileData.grouplang}_${fileData.lang}.json`), JSON.stringify(fileData, null, 2), function writeJSON(err) {
                        if (err) return console.log(err);
                        console.log('writing to ' + path.join(__dirname, 'content/new_content', `new_${fileData.grouplang}_${fileData.lang}.json`));
                    });
                } else {
                    fs.writeFile(path.join(__dirname, 'content/new_content', index + "_migrated.json"), JSON.stringify(fileData, null, 2), function writeJSON(err) {
                        if (err) return console.log(err);
                        console.log('writing to ' + path.join(__dirname, 'content/new_content', index + "_migrated.json"));
                    });
                }
            }
        });

        var output = fs.createWriteStream('new_content_zip/target.zip');
        var archive = archiver('zip');

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        });

        archive.on('error', function (err) {
            throw err;
        });

        archive.pipe(output);

        // append files from a sub-directory, putting its contents at the root of archive
        archive.directory("content/new_content", false);

        archive.finalize();
    });
}

migrateContent()