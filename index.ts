#!/usr/bin/env bun

import { program } from 'commander';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } from 'pdf-lib';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { dirname, basename, join } from 'path';
import chalk from 'chalk';

const textEncoder = new TextEncoder();
const EXT_G_STATE_KEY = 'GSDiff';

const formatNumber = (value: number): string =>
  Number(value.toFixed(4)).toString();

function invertDocumentColors(pdfDoc: PDFDocument): void {
  const context = pdfDoc.context;
  const extGStateName = PDFName.of(EXT_G_STATE_KEY);
  const diffExtGStateRef = context.register(
    context.obj({
      Type: 'ExtGState',
      BM: PDFName.of('Difference'),
    }),
  );

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    let resources =
      page.node.get(PDFName.of('Resources')) as PDFDict | PDFRef | undefined;

    if (!resources) {
      resources = context.obj({});
      page.node.set(PDFName.of('Resources'), resources);
    }

    const resourcesDict =
      resources instanceof PDFRef ? context.lookup(resources, PDFDict) : resources;

    let extGStates =
      resourcesDict.get(PDFName.of('ExtGState')) as PDFDict | PDFRef | undefined;

    if (!extGStates) {
      extGStates = context.obj({});
      resourcesDict.set(PDFName.of('ExtGState'), extGStates);
    }

    const extGStatesDict =
      extGStates instanceof PDFRef ? context.lookup(extGStates, PDFDict) : extGStates;

    if (!extGStatesDict.has(extGStateName)) {
      extGStatesDict.set(extGStateName, diffExtGStateRef);
    }

    const widthStr = formatNumber(width);
    const heightStr = formatNumber(height);

    const whiteBackgroundRef = context.register(
      context.stream(
        textEncoder.encode(
          `q\n1 1 1 rg\n0 0 ${widthStr} ${heightStr} re\nf\nQ\n`,
        ),
      ),
    );

    const invertOverlayRef = context.register(
      context.stream(
        textEncoder.encode(
          `q\n/${EXT_G_STATE_KEY} gs\n1 1 1 rg\n0 0 ${widthStr} ${heightStr} re\nf\nQ\n`,
        ),
      ),
    );

    const contents = page.node.get(PDFName.of('Contents'));
    const newContentsArray = context.obj([]);

    newContentsArray.push(whiteBackgroundRef);

    if (contents instanceof PDFArray) {
      const count = contents.size();
      for (let i = 0; i < count; i++) {
        newContentsArray.push(contents.get(i));
      }
    } else if (contents) {
      newContentsArray.push(contents);
    }

    newContentsArray.push(invertOverlayRef);
    page.node.set(PDFName.of('Contents'), newContentsArray);
  }
}

async function invertPDF(inputPath: string): Promise<void> {
  try {
    console.log(chalk.blue(`Processing: ${inputPath}`));
    
    const pdfBytes = await readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    invertDocumentColors(pdfDoc);
    
    const outputBytes = await pdfDoc.save();

    const dir = dirname(inputPath);
    const name = basename(inputPath, '.pdf');
    const outputPath = join(dir, `${name}_inverted.pdf`);
    
    await writeFile(outputPath, outputBytes);
    console.log(chalk.green(`✓ Created: ${outputPath}`));
    
  } catch (error) {
    console.error(chalk.red(`✗ Error processing ${inputPath}:`), error);
  }
}

async function invertAllPDFsInFolder(folderPath: string): Promise<void> {
  try {
    const files = await readdir(folderPath);
    const pdfFiles = files.filter(file => 
      file.toLowerCase().endsWith('.pdf') && 
      !file.toLowerCase().includes('_inverted.pdf')
    );
    
    if (pdfFiles.length === 0) {
      console.log(chalk.yellow('No PDF files found in the specified directory.'));
      return;
    }
    
    console.log(chalk.blue(`Found ${pdfFiles.length} PDF file(s) to process...`));
    
    for (const file of pdfFiles) {
      const fullPath = join(folderPath, file);
      await invertPDF(fullPath);
    }
    
    console.log(chalk.green(`\n✓ Completed processing ${pdfFiles.length} PDF file(s)!`));
    
  } catch (error) {
    console.error(chalk.red('Error reading directory:'), error);
  }
}

async function main() {
  program
    .name('pinv')
    .description('A CLI tool to invert PDF colors')
    .version('0.0.2')
    .argument('[path]', 'Path to PDF file or directory (defaults to current directory)')
    .action(async (inputPath?: string) => {
      try {
        const targetPath = inputPath || process.cwd();
        const stats = await stat(targetPath);
        
        if (stats.isDirectory()) {
          await invertAllPDFsInFolder(targetPath);
        } else if (stats.isFile() && targetPath.toLowerCase().endsWith('.pdf')) {
          await invertPDF(targetPath);
        } else {
          console.error(chalk.red('Error: Please provide a valid PDF file or directory path.'));
          process.exit(1);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.error(chalk.red(`Error: Path "${inputPath}" does not exist.`));
        } else {
          console.error(chalk.red('An unexpected error occurred:'), error);
        }
        process.exit(1);
      }
    });

  await program.parseAsync();
}


if (import.meta.main) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}