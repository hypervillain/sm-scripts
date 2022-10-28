const Prismic = require('@prismicio/client');
const dotenv = require('dotenv')
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

dotenv.config()

// Query Old and new repos
const oldRepoApiEndpoint = `https://${process.env.REPO}.cdn.prismic.io/api/v2`
const newRepoApiEndpoint = `https://${process.env.NEWREPO}.cdn.prismic.io/api/v2`

const directoryPath = path.join(__dirname, 'content/new_files_export_before_content_rel');

//build a comparison table between old documents of type TYPE with new documents of type TYPE2
async function getComparisonTable() {
    let table = [{ "type": null, "uid": null, "old": null, "new": null, "lang": null }];

    const oldDocuments = await Prismic.client(oldRepoApiEndpoint).query('', { lang: '*' })

    let i = 0;

    oldDocuments.results.forEach((element) => {
        table[i] = {}
        table[i].type = element.type
        table[i].uid = element.uid
        table[i].old = element.id
        table[i].lang = element.lang
        i++
    });

    const newDocuments = await Prismic.client(newRepoApiEndpoint).query('', { lang: '*' })
    newDocuments.results.forEach((element) => {
        index = table.findIndex(line => line.uid === element.uid && line.type === element.type && line.lang === element.lang);
        console.log(table)
        table[index].new = element.id
    });
    return(table)
}

//Update all content relationship links in all new documents from old TYPE documentID to new documentId
async function updateContentRelationships() {

    const comparisonTable = await getComparisonTable();

    //passsing directoryPath and callback function
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            // Do whatever you want to do with the file
            if (!file.startsWith(".")) {
                const fileData = require(path.join(__dirname, 'content/new_files_export_before_content_rel', file));
                // if (fileData.type.substr(fileData.type.length - 1) === '2') {
                //look for CR links in primary section
                Object.keys(fileData).forEach(function (field) {
                    if (fileData[field].wioUrl !== undefined) {
                        newContentId = comparisonTable.find(item => item.old === fileData[field].id).new;
                        fileData[field].wioUrl = "wio://documents/" + newContentId;
                        fileData[field].id = newContentId;
                    }
                    if (Array.isArray(fileData[field])) {
                        fileData[field].forEach(function (subField, index) {
                            Object.keys(fileData[field][index]).forEach(function (subField) {
                                if (fileData[field][index][subField].wioUrl !== undefined) {
                                    newContentId = comparisonTable.find(item => item.old === fileData[field][index][subField].id).new;
                                    fileData[field][index][subField].wioUrl = "wio://documents/" + newContentId;
                                    fileData[field][index][subField].id = newContentId;
                                }
                            })
                        })
                    }
                })
                // look for CR links in slices
                fileData.slices?.forEach(function (slice) {
                    Object.keys(slice.value.primary).forEach(function (field) {
                        if (slice.value.primary[field].wioUrl !== undefined) {
                            newContentId = comparisonTable.find(item => item.old === slice.value.primary[field].id).new;
                            slice.value.primary[field].wioUrl = "wio://documents/" + newContentId;
                            slice.value.primary[field].id = newContentId;
                        }
                    })
                    slice.value.items.forEach(function (field, index) {
                        Object.keys(slice.value.items[index]).forEach(function (subField) {
                            if (slice.value.items[index][subField].wioUrl !== undefined) {
                                newContentId = comparisonTable.find(item => item.old === slice.value.items[index][subField].id).new;
                                slice.value.items[index][subField].wioUrl = "wio://documents/" + newContentId;
                                slice.value.items[index][subField].id = newContentId;
                            }
                        })
                    })
                })
                fs.writeFile(path.join(__dirname, 'content/new_files_final', file), JSON.stringify(fileData, null, 2), function writeJSON(err) {
                    if (err) return console.log(err);
                    console.log('writing to ' + path.join(__dirname, 'content/new_files_final', file));
                });
                // }
            }
        });

        var output = fs.createWriteStream('new_files_final_zip/target.zip');
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
        archive.directory("content/new_files_final", false);

        archive.finalize();
    });
}

//run it
updateContentRelationships()