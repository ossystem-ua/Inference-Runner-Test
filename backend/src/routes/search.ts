import { NextFunction, Request, Response } from "express";
import urlJoin from "url-join";
import axios from "axios";
import Debug from "debug";
const debug = Debug("app");

// Options
const RETRY_COUNT: number = parseInt(process.env.RETRY_COUNT ?? "") || 10;
const URL_GENERATE_TOKEN: string = process.env.URL_GENERATE_TOKEN ?? "";
const URL_GET_CHUNKS_LIST: string = process.env.URL_GET_CHUNKS_LIST ?? "";
const URL_GET_CHUNK: string = process.env.URL_GET_CHUNK ?? "";
const CONFIDENCE_LEVEL: number = parseInt(process.env.CONFIDENCE_LEVEL ?? "");
const InferenceApiKeys: string[] = (process.env.INFERENCE_API_KEYS || "").split(
  ","
);
const ChunkApiKeys: string[] = (process.env.CHUNK_API_KEYS || "").split(",");

// Retry any function RETRY_COUNT times
// Throwing error when retry count exceeded
const retry = (fn: Function, retryCount = 0) => {
  return fn(retryCount).catch((error: any) => {
    debug(error.message);
    if (retryCount > RETRY_COUNT) {
      throw new Error("Retry count exceeded");
    }
    return retry(fn, retryCount + 1);
  });
};

// Store Chunk Holder Auth Token to minimize refresh requests
let chunkAuthToken: string;
const getAuthToken = (): Promise<string> => {
  return retry((retryCount: number) => {
    return axios
      .post(
        URL_GENERATE_TOKEN,
        {},
        {
          headers: {
            // Using retryCount we can iterate over available API Keys
            "X-API-Key": ChunkApiKeys[retryCount % ChunkApiKeys.length],
          },
        }
      )
      .then(({ data }: { data: { token: string } }) => {
        if (!data || !data.token) {
          throw new Error("Token is not generated");
        }
        chunkAuthToken = data.token;
        return data.token;
      });
  });
};

const getChunksList = (
  question: string
): Promise<[{ chunkId: string; confidence: number }]> => {
  return retry((retryCount: number) => {
    return axios
      .post(
        URL_GET_CHUNKS_LIST,
        { question },
        {
          headers: {
            // Using retryCount we can iterate over available API Keys
            "X-API-Key": InferenceApiKeys[retryCount % InferenceApiKeys.length],
          },
        }
      )
      .then(
        ({
          data,
        }: {
          data: { chunks: [{ confidence: number; chunkId: string }] };
        }) => (data && data.chunks) || []
      )
      .then((chunks: [{ confidence: number; chunkId: string }]) =>
        // Filter chunks by confidence level
        chunks.filter(
          (chunk: { confidence: number; chunkId: string }) =>
            chunk.confidence >= CONFIDENCE_LEVEL
        )
      );
  });
};

const getChunk = async (chunkId: string): Promise<[]> => {
  return retry(async () => {
    return axios
      .get(urlJoin(URL_GET_CHUNK, chunkId), {
        headers: {
          Authorization: chunkAuthToken,
        },
      })
      .then(({ data }: { data: string }) => data)
      .catch(async (error: any) => {
        // Chunk not found, shouldn't retrying
        if (error?.response?.status === 404) {
          return null;
        }
        // Generate new token and retry if auth error
        if (error?.response?.status === 401) {
          await getAuthToken();
        }
        throw new Error(error.message);
      });
  });
};

export default (request: Request, response: Response, next: NextFunction) => {
  const { question } = request.body;
  return getChunksList(question)
    .then((data) =>
      // First, generate auth token
      getAuthToken().then(() =>
        Promise.all(
          data.map((chunk) => {
            return getChunk(chunk.chunkId)
              .then((data) => ({
                confidence: chunk.confidence,
                html: data,
              }))
              .catch(() => ({
                confidence: chunk.confidence,
                html: null,
              }));
          })
        )
      )
    )
    .then((data) => response.send(data))
    .catch(next);
};
