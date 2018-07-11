
const IncomingForm = require('formidable').IncomingForm;

module.exports = function upload(req, res) {
    var form = new IncomingForm();
    var file_path;

    form.on('file', (field, file) => {
        console.info('file uploaded');
        // Do something with the file
        // e.g. save it to the database
        // you can access it using file.path
        file_path=file.path;
        
    });
    form.on('end', () => {
        res.json({'path':file_path});
    });
    form.parse(req);
};