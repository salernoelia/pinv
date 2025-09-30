#!/usr/bin/env bun

import { program } from 'commander';
import { BlendMode, PDFDocument, rgb } from 'pdf-lib';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { dirname, basename, join } from 'path';
import chalk from 'chalk';

async function invertPDF(inputPath: string): Promise<void> {
  try {
    console.log(chalk.blue(`Processing: ${inputPath}`));
    
    const pdfBytes = await readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const pages = pdfDoc.getPages();
    

    for (const page of pages) {
      const { width, height } = page.getSize();
      
     
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1), 
        blendMode: BlendMode.Difference
      });
    }
    
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
    .name('winv')
    .description('A CLI tool to invert PDF colors')
    .version('1.0.0')
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