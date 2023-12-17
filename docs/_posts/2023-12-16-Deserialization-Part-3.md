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

**Note:** Before you go through this you are highly recommended to read [Part 1](https://akashs-india.github.io/docs/security/Deserialization-Part-1/ "Part 1") and [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2")

Also due credit to one of my friends Varun who worked with me on the investigations in this part.

In this part we focus on understanding the root cause behind deserialization vulnerabilities. We use the binary formatter deserializer to analyze the same.

In [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2"), one of the key learnings from the working of binary formatter was that during deserialization, the type of the object to be created is read from the serialization payload.

## What are vulnerable types?

To understand how deserialization vulnerabilities are exploited we'll first try to understand the concept of vulnerable types. One example of a vulnerable type is the TextFormattingRunProperties. This is a class in the Microsoft.VisualStudio.Text.UI.Wpf.dll which contains WPF components. The TextFormattingRunProperties class implements ISerializable, and hence has custom deserialization logic written in its constructor.
When we deserialize objects whose classes implement the ISerializable interface, their constructor (responsible for deserialization) is called by binary formatter to create an instance of the object. From the serialized payload, the binary formatter code creates a SerializationInfo object which contains serialized data for each public member variable of the object being deserialized. It passes this serializationInfo object to the constructor of the ISerializable object. These ISerializable objects also implement a GetObjectData function which is called during the serialization of the ISerializable object. This function populates the serializationInfo object passed to it by the binary formatter code with the names of the object members and their serialized values. This object is used by binary formatter to then create the serialized byte stream of the Iserializable object.

Sharing the GetObjectData function (used during serialization) and the constructor (used during the deserialization) of the TextFormattingRunProperties class below.

<b>Note:</b> Zoom into images for clarity

![Serialization and deserialization logic of TextFormattingRunProperties](/images/DeserializationPart3_Fig1.png)

As you can notice TextFormattingRunProperties contains a member variable with name ForegroundBrush which is of type Brush. Brush is not a serializable object. During the serialization of the TextFormattingRunProperties class, the value of the ForegroundBrush member is converted to xaml and put into the serializationInfo object which is then used to create the binary stream. During the deserialization of TextFormattingRunProperties, the xaml is read back from the SerializationInfo object and XamlReader.Parse function is used to recreate the ForegroundBrush object from the serialized xaml content.

To simplify the explanation of the vulnerability we'll consider the below MyVulnerableClass which you can see has the same serialization and deserialization behaviour as the TextFormattingRunProperties class that we talked about above.

![Example of a vulnerable class](/images/DeserializationPart3_Fig2.png)

When we try to serialize the above class, the serialized payload looks like below:

![Serialized data of an instance of MyVulnerableClass](/images/DeserializationPart3_Fig3.png)

Notice the xaml content in the serialized payload which contains the value of the ForegroundBrush member of MyVulnerableClass. In our implementation of MyVulnerableClass, just like the TextFormattingRunProperties class, this xaml is parsed during deserialization using XamlReader.Parse.

One of the functionalities/usecases of xaml is that it allows executing a process. For example the below xaml content specifies that the code processing this xaml should invoke the calculator function. Hence when XamlReader.Parse is used to process this xaml content, a calculator process gets spawned.


![Executing a process using Xaml](/images/DeserializationPart3_Fig4.png)

Now this is where things get interesting. Can the xaml content in our serialized payload of the MyVulnerableClass be replaced with the above xaml that can cause a process to be spawned? 
- Its possible!!
So as a malicious client I can create a serialized payload of the MyVulnerableClass/TextFormattingRunProperties class. In the same I can put in the malicious xaml to spawn a process on the server side when the deserialization of the payload happens. This way I can achieve remote code execution on the server deserializing the payload.

## How exactly do I create a malicious payload?

In the below code example, as an attacker I can simply create a MyVulnerableClassMarshal class that implements ISerializable interface. In the GetDataObject function I can set the type of serialized object to MyVulnerableClass/TextFormattingRunProperties and set the ForegroundBrush serialized payload to the malicious xaml.
Using binary formatter to create serialized data for an instance of MyVulnerableClassMarshal would give me my malicious payload which I can pass to a server.

![Code of a marshal class to create a malicious payload](/images/DeserializationPart3_Fig5.png)

This exploitation method would work only if the dll containing the vulnerable class (MyVulnerableClass/TextFormattingRunProperties) can be loaded into the server side process. The reason why such attacks have been easy to exploit is that there are several vulnerable types within .Next framework, the dlls for which can almost always be expected to be available on the server. While we are discussing primarily from perspective of .net framework, this is also a known problem with other frameworks.

These vulnerable types are called gadgets. [YsoSerial](https://github.com/frohoff/ysoserial "YsoSerial"). is a tool that can be used to generate such malicious payloads for several gadgets.

## Understanding the attack path

So in a genuine use case of serialization and deserialization, a client serializes an object (say of class demo - denoted via an apple) which it sends to the server to process. The server deserializes this serialized data to create an object of class demo and processes this data to return the result.


![Class having internal class](/images/DeserializationPart3_Fig6.png)

Such a server endpoint which performs deserialization as shown can be exploited by an attacker. The attacker could create a payload from a vulnerable type as shown in the earlier sections and send it to the server. The vulnerable type does not even need to be same as 'demo' which is the expected type of the object on the server side. The reason is that binary formatter decides on the object to instantiate based on the name of the type provided in the serialized payload. - this is what makes it inherently vulnerable. When 'the type to be deserialized is controlled by user input' - it leads to deserialization vulnerabilities.

The whole attack path is represented in the image below:

![Serialized data of object having internal object](/images/DeserializationPart3_Fig7.png)

Hoping you now have an understanding of deserialization related vulnerabilities. There are several ways to prevent such vulnerabilities which will be a topic for discussion in the last part.