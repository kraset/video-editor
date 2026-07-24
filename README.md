# Simple Video Editor

A lightweight, open-source desktop video editor built with Electron, TypeScript, and FFmpeg.
The application focuses on common video-processing tasks without the complexity or resource usage of full-featured editors such as DaVinci Resolve.


## Features
The editor can perform one or several operations in a single FFmpeg process:
* Trim video
* Crop video
* Scale or downscale video
* Compress video
* Reduce the frame rate
* Convert between supported formats
* Convert video to MP4
* Remove audio
* Replace audio

When possible, the application uses stream copying to avoid unnecessary re-encoding. Operations such as cropping, scaling, frame-rate reduction, and compression require the video stream to be re-encoded.


## Requirements
* Node.js
* npm
* FFmpeg
* Electron-supported operating system

See `GetStartedWithElectron.md` for setup instructions.

## Note on FFmpeg
The app will ask for the path to your local ffmpeg.exe file.


## Getting Started
Clone or download the repository and install the dependencies:
```
npm install
```

Start the application in development mode:
```
npm start
```

## Build the Application
Create a distributable package:
```
npm run make
```
The generated files are placed in the Electron Forge output directory.


## Project Status
The project is provided as-is. I may not actively maintain this repository, but feel free to fork it and continue development.


## Possible Improvements
* Capture an image from the current video frame
* Display the current playback time and frame index
* Refactor and clean up the codebase
* Split/Trim/Concat in one single operation
* Show the generated video in a result player after processing
* Play generated videos with audio when available
* Add a **Remove Last Generated Video** button
* Show FFmpeg progress while processing
* Add configurable output filenames and output directories
* Add presets for common output formats and quality levels


## FFmpeg
This application uses FFmpeg for media processing.
Note: FFmpeg is a separate project and is not part of this repository unless explicitly included in a release package. 
Users are responsible for installing or providing a compatible FFmpeg build.

## Contributing
Contributions, bug reports, and feature suggestions are welcome.
However, I suggest forking the project so you don't have to wait for the original creator's active participation.


## License
This project is licensed under the MIT License.
See the attached [`LICENSE`](LICENSE) file for details.


## Disclaimer
This software is provided without warranty. 
Keep backups of important source files and verify generated output before removing any original media.
