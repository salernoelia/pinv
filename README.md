# winv

Invert PDF colors from the command line.

## Usage (Binary)

- Invert all PDFs in the current folder:
  ```
  winv
  ```

  - Invert all PDFs in a folder:
  ```
  winv path/to/folder
  ```

- Invert a specific PDF:
  ```
  winv path/to/file.pdf
  ```



## Build manually

```
bun build ./index.ts --compile --outfile winv
```

Creates `*_inverted.pdf` for each processed file.