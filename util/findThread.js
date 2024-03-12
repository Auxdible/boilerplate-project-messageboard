const { findReplies } = require("./findReplies");
const mongoClient = require("./mongoClient")

module.exports = {
    async findThread(id) {
        return await mongoClient.collection('threads').findOne({
            _id: {
                equals: id
            }
        },
        {
            projection: { delete_password: 0 }
        })
        .then(async (data) => {
            console.log(data);
            if (!data['replies']) return data;
            let replies = [];
            for (let r in data['replies']) {
                replies.push(await findReplies(r))
            }
            return { 
                _id: data._id,
                created_on: data.created_on,
                bumped_on: data.updated_on,
                replies
            }
        }).catch(() => {
            return undefined;
        })
    }
}