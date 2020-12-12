export const functionsHealth = {
    path: '/functions-health',
    onRequest: (request, response) => {
        response.json({message: 'running'});
    }
};
