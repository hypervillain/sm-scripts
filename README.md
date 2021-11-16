Untested.

## 1. Update Prismic CTS to use SharedSlices

Create a `.env` file with `TOKEN` (prismic-auth) and `REPO` values.

```bash
npm install
node migrate-cts.mjs
````

This will create customtypes ans slices folders.
In the custom type folder, rename the custom type by adding a "2" at the end of their ID and Name to distinguish old and new custom types.
Then push newly created custom types and slices through slice machine.

## 2. Adapt your documents to SharedSlices format

Note that this process needs to be split into parts if there are more than 200 documents, as the Import module lets you upload a ZIP archive containing up to 200 JSON files, each file representing the content for one Prismic document.

Create the following folders at the root of your project, to handle different versions of your document

![image](https://user-images.githubusercontent.com/89452979/141962485-128051db-a357-45f4-9046-b6afbd9f8855.png)

### a. Change the formatting of your document
 
Export your documents from the Prismic export feature. 
Place the extracted json files in "content/export_old_docs" folder.

Then run migration-content.js.

This will create a zip in the new_content_zip folder.
Upload this zip with the Prismic Import feature into your repo.

### b. Change content relationships (Have them point to newly created documents)

Export a second time your documents from the Prismic export feature. 
Place the extracted json files in "content/new_files_export_before_content_rel" folder

Then run migration-cr.js to change content relationships

Finally you can upload the zip located in new_files_final_zip into your repo.
