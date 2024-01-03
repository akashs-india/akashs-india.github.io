---
title: "Deserialization Vulnerabilities in .Net - Part 3"
sub_title: "A deep dive"
excerpt: Understanding deserialization vulnerabilties and how to exploit them.
categories:
  - Security
elements:
  - content
  - css
  - formatting
  - html
  - markup
last_modified_at: 2023-12-16T10:16:49-05:00
---

**Note:** Prior to proceeding further, it is highly advisable to familiarize yourself with [Part 1](https://akashs-india.github.io/docs/security/Deserialization-Part-1/ "Part 1") and [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2") offering profound insights into serialization and deserialization, specifically within the context of the binary formatter in .NET.

I would like to extend due credit to my friend Varun, who collaborated with me on the investigations in this part.

In this section, our focus is on comprehending the root cause behind deserialization vulnerabilities. We employ the binary formatter deserializer to analyze these vulnerabilities.

In [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2"), oa pivotal takeaway from our exploration of the binary formatter is that, during deserialization, the type of the object to be instantiated is extracted from the serialization payload.

## What are vulnerable types?

To grasp how deserialization vulnerabilities are exploited, let's delve into the concept of vulnerable types. An exemplary instance of a vulnerable type is the `TextFormattingRunProperties` class found in the `Microsoft.VisualStudio.Text.UI.Wpf.dll`, housing WPF components. This class implements `ISerializable`, indicating it has custom deserialization logic within its constructor.
When we deserialize objects whose classes implement the `ISerializable` interface, their constructor (responsible for deserialization) is called by binary formatter to create an instance of the object.  The binary formatter code generates a SerializationInfo object from the serialized payload, encompassing data for each public member variable of the object being deserialized. This serializationInfo object is passed to the constructor of the `ISerializable` object. These `ISerializable` objects also implement a `GetObjectData` function, called during the serialization of the `ISerializable` object. This function populates the `SerializationInfo` object passed to it by the binary formatter code, with the names of the object members and their serialized values. This object is used by binary formatter to then create the serialized byte stream of the `ISerializable` object.

Here's a representation of the `GetObjectData` function (used during serialization) and the constructor (used during deserialization) of the `TextFormattingRunProperties` class:

<b>Note:</b> Zoom into images for clarity

![Serialization and deserialization logic of TextFormattingRunProperties](/images/DeserializationPart3_Fig1.png)

In the case of `TextFormattingRunProperties`, it contains a member variable named `ForegroundBrush` of type `Brush`, which is not serializable. During serialization of the `TextFormattingRunProperties` class, the value of the `ForegroundBrush` member is converted to XAML and added into the `SerializationInfo` object, which is then used to create the binary stream. During the deserialization of `TextFormattingRunProperties`, the XAML is read back from the `SerializationInfo` object and `XamlReader.Parse` function is used to recreate the `ForegroundBrush` object from the serialized XAML content.

To simplify the explanation of the vulnerability, let's consider the class `MyVulnerableClass` below, exhibiting the same serialization and deserialization behavior as the `TextFormattingRunProperties` class discussed above:

![Example of a vulnerable class](/images/DeserializationPart3_Fig2.png)

Upon attempting to serialize `MyVulnerableClass`, the resulting serialized payload appears as follows:

![Serialized data of an instance of MyVulnerableClass](/images/DeserializationPart3_Fig3.png)

Observe the XAML content in the serialized payload, containing the value of the `ForegroundBrush` member of `MyVulnerableClass`. In our implementation of `MyVulnerableClass`, just like the `TextFormattingRunProperties` class, this XAML is parsed during deserialization using `XamlReader.Parse`.

One of the functionalities/usecases of XAML is that it allows executing a process. For example the below XAML content specifies that the code processing this XAML should invoke the calculator function. Hence, when `XamlReader.Parse` is used to process this XAML content, a calculator process gets spawned.


![Executing a process using XAML](/images/DeserializationPart3_Fig4.png)

Here's where it gets intriguing. Can the XAML content in the serialized payload of `MyVulnerableClass` be substituted with malicious XAML that triggers a process to spawn? 

Absolutely!
As a malicious client, I can craft a serialized payload of `MyVulnerableClass`/`TextFormattingRunProperties`, incorporating malevolent XAML to spawn a process on the server side during payload deserialization. This approach enables remote code execution on the server handling the deserialization process.

## Crafting a Malicious Payload: A Step-by-Step Guide

Creating a malicious serialized payload involves a strategic implementation, as demonstrated in the code snippet below. In this example, an attacker can construct a `MyVulnerableClassMarshal` class that implements the `ISerializable` interface. Within the `GetObjectData` function, the attacker sets the type of the serialized object to `MyVulnerableClass`/`TextFormattingRunProperties` and configures the serialized payload for the `ForegroundBrush` member with malicious XAML. Leveraging the binary formatter to create serialized data for an instance of `MyVulnerableClassMarshal` yields the desired malicious serialized payload for the `MyVulnerableClass`/`TextFormattingRunProperties` class, which can then be transmitted to a server.

![Code of a marshal class to create a malicious payload](/images/DeserializationPart3_Fig5.png)

It's crucial to note that this exploitation method is effective only if the DLL containing the vulnerable class (`MyVulnerableClass`/`TextFormattingRunProperties`) can be loaded into the server-side process. The susceptibility arises from the prevalence of several vulnerable types within the .NET framework, with DLLs for these types almost always expected to be available on the server. While our discussion primarily focuses on the .NET framework, similar challenges exist in other languages and frameworks as well.

These vulnerable types are called gadgets. [YsoSerial](https://github.com/frohoff/ysoserial "YsoSerial") is a tool designed to generate such malicious payloads for various gadgets.

## Deciphering the Attack Path

In a typical use case of serialization and deserialization, a client serializes an object (e.g., an instance of `demo` class, symbolized by an apple) which it transmits to the server for processing. The server, in turn, deserializes this serialized data to instantiate an object of the `demo` class and proceeds to process the information, ultimately returning the results.

![Class having internal class](/images/DeserializationPart3_Fig6.png)

However, this seemingly innocuous server endpoint, responsible for deserialization, becomes a potential vulnerability. An attacker can exploit this by crafting a payload using a vulnerable type, as elucidated in earlier sections, and then dispatch it to the server. Intriguingly, the vulnerable type need not align with the expected `demo` type on the server side. The critical vulnerability lies in the fact that the binary formatter determines the object to instantiate based on the type name provided in the serialized payload. This inherent behavior is what makes it susceptible. When "the type to be deserialized is controlled by user input," it becomes a breeding ground for deserialization vulnerabilities.

The comprehensive attack path is visually represented in the image below:

![Serialized data of object having internal object](/images/DeserializationPart3_Fig7.png)

With this insight, you now possess a nuanced understanding of deserialization-related vulnerabilities. In the forthcoming final part, we will delve into various preventive measures to fortify against such vulnerabilities.