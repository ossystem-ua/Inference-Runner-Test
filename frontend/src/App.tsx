import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Button,
  Grid,
  OutlinedInput,
  FormControl,
  InputLabel,
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import * as DOMPurify from "dompurify";
import "./App.css";

const client = axios.create({
  baseURL: "/search",
});

function App() {
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [chunks, setChunks] = useState([]);
  const [error, setError] = useState(false);

  const searchQuestion = () => {
    setLoading(true);
    setError(false);
    setChunks([]);
    client
      .post("", { question })
      .then((res) => {
        setChunks(res.data);
      })
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Container maxWidth="md">
        <>
          <Grid container spacing={2} alignItems="center" sx={{ m: 1 }}>
            <Grid item xs={10}>
              <FormControl fullWidth>
                <InputLabel htmlFor="question">Question</InputLabel>
                <OutlinedInput
                  id="question"
                  label="Question"
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                  }}
                />
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <Button variant="contained" onClick={searchQuestion}>
                Search
              </Button>
            </Grid>
          </Grid>
          {chunks && chunks.length ? (
            chunks
              .sort((a: any, b: any) => b.confidence - a.confidence)
              .map((chunk: any, index) => (
                <Card sx={{ m: 1 }} key={index}>
                  <CardContent>
                    <Typography
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(chunk.html),
                      }}
                    />
                  </CardContent>
                  <CardActions>
                    Confidence: {chunk.confidence.toFixed(2)}%
                  </CardActions>
                </Card>
              ))
          ) : error ? (
            <Grid textAlign={"center"}>
              <Typography>Failed to process request</Typography>
            </Grid>
          ) : (
            (!loading && (
              <Grid textAlign={"center"}>
                <Typography>No answers found</Typography>
              </Grid>
            )) ||
            ""
          )}
        </>
      </Container>
      <Backdrop open={loading}>
        <CircularProgress />
      </Backdrop>
    </>
  );
}

export default App;
