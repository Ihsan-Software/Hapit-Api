const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');

mongoose.connect(process.env.OLD_ATLAS_DATABASE).then(() => {
    console.log("Connected To Database Success...🚀");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server Starting At Port ${port}...✨`);
});
