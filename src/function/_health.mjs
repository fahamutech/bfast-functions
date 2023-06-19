export const functions__health__ = {
    path: '/functions-health',
    onRequest: (_, response) => response.json({message: 'running'})
};
