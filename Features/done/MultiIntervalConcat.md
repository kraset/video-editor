# Ny feauture: "Multi-Interval-Concat"
The user can select multiple trim-ranges and they will be concatenated into 1 result video.

## Ny checkbox action: "Multi-Interval-Concat"
- Denna ska vara mutually exclusive med allt annat, dvs är något annat valt, så dölj denna option, och är denna option vald, dölj de andra.

## Knappar för parametrar
Denna ska fungera liknande som trim, så där ska finnas följande knappar:
Set Start, Set End, Add Range, Clear Ranges

## När man väljer "Add Range"
Det ska finnas en range visare i text som visar valda tidsranges: 
Selected ranges: [{startTime1, endTime1}, {startTime2, endTime2}, ...].

Det måste finnas minst en selected range ("Add Range") för att gå till state AppState.ReadyForAction.
När användaren har valt n stycken ranges, skapa och kör ffmpeg kommando som letar upp dessa ranges och gör concat på dem. 
Något i stil med detta:
----
ffmpeg -i input.mp4 -filter_complex "[0:v]trim=start=10:end=20,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=10:end=20,asetpts=PTS-STARTPTS[a0];[0:v]trim=start=45:end=60,setpts=PTS-STARTPTS[v1];[0:a]atrim=start=45:end=60,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" output.mp4
----