# 4office spausdinimo paleidimas kitame Windows kompiuteryje

Šitas variantas skirtas kompiuteriui, kuriame nėra jokių programavimo įrankių.

## Ko reikia

- `Microsoft Word`
- prijungto ir Windows matomo spausdintuvo
- šito projekto aplanko, pvz. `C:\4office\my-app`

## Ką nukopijuoti į kitą kompiuterį

Nukopijuok visą projekto aplanką, pvz.:

```text
C:\4office\my-app
```

Svarbiausi failai:

- `watch-print-docx.ps1`
- `start-print-watcher.cmd`
- `install-print-watcher-startup.ps1`

## Rankinis testas

1. Atidaryk projekto aplanką.
2. Paleisk:

```text
start-print-watcher.cmd
```

3. Į aplanką:

```text
print-queue
```

įdėk failą tokiu pavadinimu:

```text
IR-1234.docx
```

4. Watcheris turi:
- atspausdinti dokumentą
- perkelti jį į `print-queue\printed`

## Automatinis paleidimas su kompiuterio startu

1. Atidaryk PowerShell kaip Administrator.
2. Pereik į projekto aplanką, pvz.:

```powershell
cd C:\4office\my-app
```

3. Paleisk:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-print-watcher-startup.ps1
```

Po šito Windows sukurs `Task Scheduler` užduotį, kuri watcherį paleis automatiškai prisijungus prie vartotojo.

## Kur dėti failus spausdinimui

Failus dėk čia:

```text
print-queue
```

Tik tinkami pavadinimai:

```text
IR-1234.docx
IR-5678.docx
```

## Kur žiūrėti logą

Logas rašomas čia:

```text
print-queue\watch-print-docx.log
```

## Jei nori sustabdyti automatinį paleidimą

Atidaryk `Task Scheduler` ir ištrink užduotį:

```text
4office Print Watcher
```
