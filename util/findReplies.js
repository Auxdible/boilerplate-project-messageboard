module.exports = {
    async findReplies(_id) {
        return await mongoClient.collection('replies').findOne({
            _id
        },
        {
            projection: { delete_password: 0 }
        })
        .catch(() => {
            return undefined;
        })
    }
}