param([string]$SourceFolder='reports/simple-import',[string]$OutputFolder='reports/simple-excel')
$ErrorActionPreference='Stop'
$taskOutput=Join-Path (Get-Location).Path $OutputFolder
New-Item -ItemType Directory -Force $taskOutput | Out-Null
$taskExcel=New-Object -ComObject Excel.Application
try {
 $taskExcel.Visible=$false
 $taskExcel.DisplayAlerts=$false
 $taskExcel.AutomationSecurity=3
 foreach($taskFile in Get-ChildItem -LiteralPath $SourceFolder -Filter '*.xlsx'){
  $taskBook=$taskExcel.Workbooks.Open($taskFile.FullName,0,$true)
  try {
   if($taskBook.Worksheets.Count -ne 1){throw 'Expected one input sheet'}
   $taskSheet=$taskBook.Worksheets.Item('批量填写')
   $taskColumns=$taskSheet.UsedRange.Columns.Count
   $taskSheet.Range($taskSheet.Cells.Item(2,1),$taskSheet.Cells.Item(2,$taskColumns)).Copy($taskSheet.Cells.Item(3,1)) | Out-Null
   $taskSheet.Cells.Item(3,1).Value2='COPY-ROW'
   $taskBook.SaveCopyAs((Join-Path $taskOutput $taskFile.Name))
   Write-Output ('Excel opened and copied row: '+$taskFile.BaseName)
  }finally{$taskBook.Close($false)}
 }
}finally{$taskExcel.Quit();[System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskExcel)|Out-Null}
