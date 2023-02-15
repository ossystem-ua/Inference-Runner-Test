var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c, _d, _e;
import urlJoin from "url-join";
import axios from "axios";
import Debug from "debug";
const debug = Debug("app");
// Options
const RETRY_COUNT = parseInt((_a = process.env.RETRY_COUNT) !== null && _a !== void 0 ? _a : "") || 10;
const URL_GENERATE_TOKEN = (_b = process.env.URL_GENERATE_TOKEN) !== null && _b !== void 0 ? _b : "";
const URL_GET_CHUNKS_LIST = (_c = process.env.URL_GET_CHUNKS_LIST) !== null && _c !== void 0 ? _c : "";
const URL_GET_CHUNK = (_d = process.env.URL_GET_CHUNK) !== null && _d !== void 0 ? _d : "";
const CONFIDENCE_LEVEL = parseInt((_e = process.env.CONFIDENCE_LEVEL) !== null && _e !== void 0 ? _e : "");
const InferenceApiKeys = (process.env.INFERENCE_API_KEYS || "").split(",");
const ChunkApiKeys = (process.env.CHUNK_API_KEYS || "").split(",");
// Retry any function RETRY_COUNT times
// Throwing error when retry count exceeded
const retry = (fn, retryCount = 0) => {
    return fn(retryCount).catch((error) => {
        debug(error.message);
        if (retryCount > RETRY_COUNT) {
            throw new Error("Retry count exceeded");
        }
        return retry(fn, retryCount + 1);
    });
};
// Store Chunk Holder Auth Token to minimize refresh requests
let chunkAuthToken;
const getAuthToken = () => {
    return retry((retryCount) => {
        return axios
            .post(URL_GENERATE_TOKEN, {}, {
            headers: {
                // Using retryCount we can iterate over available API Keys
                "X-API-Key": ChunkApiKeys[retryCount % ChunkApiKeys.length],
            },
        })
            .then(({ data }) => {
            if (!data || !data.token) {
                throw new Error("Token is not generated");
            }
            chunkAuthToken = data.token;
            return data.token;
        });
    });
};
const getChunksList = (question) => {
    return retry((retryCount) => {
        return axios
            .post(URL_GET_CHUNKS_LIST, { question }, {
            headers: {
                // Using retryCount we can iterate over available API Keys
                "X-API-Key": InferenceApiKeys[retryCount % InferenceApiKeys.length],
            },
        })
            .then(({ data, }) => (data && data.chunks) || [])
            .then((chunks) => 
        // Filter chunks by confidence level
        chunks.filter((chunk) => chunk.confidence >= CONFIDENCE_LEVEL));
    });
};
const getChunk = (chunkId) => __awaiter(void 0, void 0, void 0, function* () {
    return retry(() => __awaiter(void 0, void 0, void 0, function* () {
        return axios
            .get(urlJoin(URL_GET_CHUNK, chunkId), {
            headers: {
                Authorization: chunkAuthToken,
            },
        })
            .then(({ data }) => data)
            .catch((error) => __awaiter(void 0, void 0, void 0, function* () {
            var _f, _g;
            // Chunk not found, shouldn't retrying
            if (((_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status) === 404) {
                return null;
            }
            // Generate new token and retry if auth error
            if (((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.status) === 401) {
                yield getAuthToken();
            }
            throw new Error(error.message);
        }));
    }));
});
export default (request, response, next) => {
    const { question } = request.body;
    return getChunksList(question)
        .then((data) => 
    // First, generate auth token
    getAuthToken().then(() => Promise.all(data.map((chunk) => {
        return getChunk(chunk.chunkId)
            .then((data) => ({
            confidence: chunk.confidence,
            html: data,
        }))
            .catch(() => ({
            confidence: chunk.confidence,
            html: null,
        }));
    }))))
        .then((data) => response.send(data))
        .catch(next);
};
