# pinv

![Demo](./demo.gif)

Invert PDF colors from the command line.

## Usage (Binary)

- Invert all PDFs in the current folder:
  ```
  pinv
  ```

  - Invert all PDFs in a folder:
  ```
  pinv path/to/folder
  ```

- Invert a specific PDF:
  ```
  pinv path/to/file.pdf
  ```


## Add binary to PATH on macOS

After building, copy the binary to a directory in your PATH (e.g. `/usr/local/bin`):

```bash
sudo cp /Users/<user>/pinv /usr/local/bin/pinv
```


## Build manually

```
bun build ./index.ts --compile --outfile pinv
```

Creates `*_inverted.pdf` for each processed file.