export const functions__health__ = {
    path: '/functions-health',
    onRequest: (_, response) => response.status(200).json({message: 'running'})
};
