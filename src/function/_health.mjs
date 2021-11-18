export const functions__health__ = {
    path: '/functions-health',
    onRequest: (request, response) => {
        response.json({message: 'running'});
    }
};
