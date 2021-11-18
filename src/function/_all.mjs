import {getFunctions} from "../controllers/resolver.mjs";

export const functions__all__ = {
    path: '/functions-all',
    onRequest: (request, response) => {
        getFunctions(null).then(fs => {
            response.json(fs);
        }).catch(e => {
            response.status(400).send(e);
        });
    }
};
