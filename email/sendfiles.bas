Sub Send_Files()
    Dim OutApp As Object
    Dim OutMail As Object
    Dim sh As Worksheet
    Dim cell As Range
    Dim emailCount As Integer
    Dim EmailAddressRange As Range
    Dim currentDirectory As String

    'Set up indices for columns of interest
    Dim ColEmail As Integer
    Dim ColFirstName As Integer
    Dim ColLastName As Integer
    Dim ColPropertyAddress As Integer
    Dim ColPropertyId As Integer
    Dim ColPropertyName As Integer
    Dim ColYear As Integer
    Dim ColFile As Integer

    currentDirectory = ActiveWorkbook.Path
    With Application
        .EnableEvents = False
        .ScreenUpdating = False
    End With

    Set sh = Sheets("Sheet1")
    ColEmail = Application.WorksheetFunction.Match("Email address", sh.Rows(1), 0)
    ColFirstName = Application.WorksheetFunction.Match("First name", sh.Rows(1), 0)
    ColLastName = Application.WorksheetFunction.Match("Last name", sh.Rows(1), 0)
    ColPropertyAddress = Application.WorksheetFunction.Match("Property address", sh.Rows(1), 0)
    ColPropertyId = Application.WorksheetFunction.Match("property_id", sh.Rows(1), 0)
    ColPropertyName = Application.WorksheetFunction.Match("Property name", sh.Rows(1), 0)
    ColYear = Application.WorksheetFunction.Match("Year", sh.Rows(1), 0)
    ColFile = Application.WorksheetFunction.Match("File", sh.Rows(1), 0)

    Set OutApp = CreateObject("Outlook.Application")
    Set EmailAddressRange = sh.Columns(ColEmail).Cells.SpecialCells(xlCellTypeConstants)

    emailCount = -1
    For Each cell In EmailAddressRange
        emailCount = emailCount + 1
        Application.StatusBar = "Progress: " & emailCount & " of " & (EmailAddressRange.Count - 1) & " " & currentDirectory
        If cell.Value Like "?*@?*.?*" Then
            Set OutMail = OutApp.CreateItem(0)
            Dim HTMLText As String
            Dim Subject As String
            Dim Year As String
            Dim FirstName As String
            Dim LastName As String
            Dim PropertyAddress As String
            Dim PropertyId As String
            Dim PropertyName As String

            Year = sh.Cells(cell.Row, ColYear).Value
            FirstName = sh.Cells(cell.Row, ColFirstName).Value
            LastName = sh.Cells(cell.Row, ColLastName).Value
            PropertyAddress = sh.Cells(cell.Row, ColPropertyAddress).Value
            PropertyId = sh.Cells(cell.Row, ColPropertyId).Value
            PropertyName = sh.Cells(cell.Row, ColPropertyName).Value
            Subject = "Building scorecard for " & Year

            HTMLText = "<!DOCTYPE html><html><body>"
            HTMLText = HTMLText & "<p>Dear " & FirstName & " " & LastName & ",</p>"
            HTMLText = HTMLText & "<p><strong>Thank you</strong> for benchmarking and reporting your building's energy use with the City of Seattle for " & Year & "!</p>"
            HTMLText = HTMLText & "<p>Your custom <strong>Energy Performance Profile</strong> is attached and available to view online&mdash;see the link below.</p>"
            HTMLText = HTMLText & "<ul><li><a href=""http://www.seattle.gov/energybenchmarkingmap/#seattle/" & Year & "?building=" & PropertyId & "&report_active=true"">" & PropertyName & ", " & PropertyAddress & " (" & PropertyId & ")</a></li></ul>"
            HTMLText = HTMLText & "<p>If you have additional buildings reporting through the program, you can print their profiles online.</p>"
            HTMLText = HTMLText & "<img src=""https://cityenergyproject.github.io/seattle/images/email/scorecard-example.png"" />"
            HTMLText = HTMLText & "<p><strong>Performance Profiles</strong> show how your building is doing year over year compared to similar buildings in Seattle. The profiles provide a view into your current energy and carbon performance, show how you're doing over time, and provide resources to help reduce energy use.</p>"
            HTMLText = HTMLText & "<p><strong>Questions?</strong><br/>Reply to this email or call us at 206-747-8484.</p>"
            HTMLText = HTMLText & "<p><strong>Feedback?</strong><br/>Submit your ideas for improvement here.</p>"
            HTMLText = HTMLText & "<p>Regards,<br/>The Seattle Energy Benchmarking Program</p>"
            HTMLText = HTMLText & "<div><img src=""https://cityenergyproject.github.io/seattle/images/email/seattle-energy-benchmarking.png""/></div>"
            HTMLText = HTMLText & "<table>"
            HTMLText = HTMLText & "<tr><td>web:</td><td><a href=""https://www.seattle.gov/energybenchmarking"">www.seattle.gov/energybenchmarking</a></td></tr>"
            HTMLText = HTMLText & "<tr><td>email:</td><td><a href=""mailto:energybenchmarking@seattle.gov"">energybenchmarking@seattle.gov</a></td></tr>"
            HTMLText = HTMLText & "<tr><td>phone:</td><td>206-727-8484</td></tr>"
            HTMLText = HTMLText & "</table>"
            HTMLText = HTMLText & "</body></html>"

            With OutMail
                .to = cell.Value
                .Subject = Subject
                .HTMLBody = HTMLText

                Dim File As String
                File = currentDirectory & "\" & sh.Cells(cell.Row, ColFile).Value
                If Dir(File) <> "" Then
                    .Attachments.Add File
                End If

                .Display
                .Send
            End With

            Set OutMail = Nothing
        End If
    Next cell

    Set OutApp = Nothing
    With Application
        .EnableEvents = True
        .ScreenUpdating = True
    End With
End Sub
